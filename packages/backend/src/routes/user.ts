import { Context } from "koa";
import jwt from "jsonwebtoken";
import { privateKey } from "@/config";
import { RoomModel } from "@/model/room";
import { UserModel } from "@/model/user";
import { isValidObjectId } from "mongoose";
import { getVerifiedToken } from "@/utils/token";
import { IChannelType } from "db";

/**
 * get user info through cookie
 * @param {*} ctx
 */
export async function GetUserInfo(ctx: Context) {
  const cookie = ctx.cookies.get("token") ?? "";
  const id = jwt.verify(cookie, privateKey) as string;
  const _userinfo = await UserModel.findUnique({ where: { id } });
  const userinfo = {
    ..._userinfo,
    friend: await UserModel.findMany({
      where: {
        id: { in: _userinfo?.friend },
      },
    }),
  };
  if (userinfo) {
    const room = await RoomModel.findMany({
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],
      where: { member: { has: id } },
    });
    // .sort("-updatedAt")
    // .populate("member")
    // .populate("admin")
    // .populate("message");
    ctx.body = {
      code: 0,
      data: {
        ...userinfo,
        room: room.map((r) => {
          return Object.assign(r, {
            totalCount: r.messageId.length,
            lastMsg: r.messageId[r.messageId.length - 1],
            message: undefined,
          });
        }),
      },
    };
    return;
  }
  ctx.body = {
    code: 1,
    message: "cannot find user",
  };
}
/**
 * 只能设置自己的信息
 *
 * @param {*} ctx
 */
export async function SetUserInfo(ctx: Context) {
  const image = ctx.request.body.image as string;
  const cookie = ctx.cookies.get("token") ?? "";
  const id = jwt.verify(cookie, privateKey) as string;
  await UserModel.update({
    where: { id },
    data: { image },
  });
  const _userinfo = await UserModel.findUnique({ where: { id } });
  // .populate("friend")
  // .populate("room");
  const userinfo = {
    ..._userinfo,
    friend: await UserModel.findMany({
      where: {
        id: { in: _userinfo?.friend },
      },
    }),
  };
  if (userinfo) {
    ctx.body = {
      code: 0,
      data: userinfo,
    };
  } else {
    ctx.body = {
      code: 0,
    };
  }
}

export async function GetUserImage(ctx: Context) {
  const username = ctx.request.query.username as string;
  if (username) {
    const userinfo = await UserModel.findUnique({
      where: { username },
    });
    if (userinfo) {
      userinfo.password = "";
      ctx.body = {
        code: 0,
        data: userinfo.image,
      };
    } else {
      ctx.body = {
        code: 1,
        data: null,
      };
    }
  } else {
    ctx.body = {
      code: 0,
      data: null,
    };
  }
}

export async function QueryUser(ctx: Context) {
  const username = ctx.request.query?.username as string;
  if (username) {
    const users = await UserModel.findMany({
      where: {
        username,
      },
    });
    ctx.body = {
      code: users ? 0 : 1,
      data: users ?? [],
    };
  } else {
    ctx.body = {
      code: 1,
      message: "Please provide info to query user infomation.",
      data: [],
    };
  }
}

export async function Login(ctx: Context) {
  if (!ctx.request.body) {
    ctx.body = {
      data: null,
      code: 1,
      message: "must provide username or password!",
    };
    return;
  }
  const { username, password } = ctx.request.body;
  const userinfo = await UserModel.findUnique({
    where: { username, password },
  });
  if (userinfo) {
    const token = jwt.sign(String(userinfo.id), privateKey);
    ctx.cookies.set("token", token, { maxAge: 3600000, httpOnly: false });
    userinfo.password = "";
    ctx.body = {
      data: userinfo,
      code: 0,
      message: "login success",
    };
  } else {
    ctx.body = {
      code: 1,
      message: "password or username wrong",
    };
  }
}

export async function Register(ctx: Context) {
  if (!ctx.request.body) {
    ctx.body = {
      code: 1,
      message: "must provide username or password!",
    };
    return;
  }
  const { username, password } = ctx.request.body;
  const userInfo = await UserModel.findUnique({ where: { username } });
  if (userInfo) {
    ctx.body = {
      code: 1,
      message: "This account is already occupied!",
    };
  } else {
    const userinfo = await UserModel.create({
      data: {
        username,
        password,
      },
    });
    // const userinfo = await UserModel.create({
    //   username,
    //   password,
    // });
    const token = jwt.sign(String(userinfo.id), privateKey);
    ctx.cookies.set("token", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: false,
    });
    userinfo.password = "";
    ctx.body = {
      code: 0,
      message: "Register account success",
      data: userinfo,
    };
  }
}

export async function Logout(ctx: Context) {
  ctx.cookies.set("token", null);
  ctx.body = {
    code: 0,
    message: "Logout success",
  };
}
/**
 * 一次只能添加一个好友, 不可重复添加已存在的好友.
 *
 * @param {*} ctx
 */
export async function AddFriend(ctx: Context) {
  const id = String(ctx.request.body.id) ?? "";
  if (!id || !isValidObjectId(id)) {
    ctx.body = {
      code: 1,
      message: "id incorrect",
    };
    return;
  }
  // const { image } = ctx.request.body;
  const cookie = ctx.cookies.get("token") ?? "";
  const userIdFromToken = jwt.verify(cookie, privateKey) as string;
  const token = getVerifiedToken(ctx);
  if (id === userIdFromToken) {
    ctx.body = {
      code: 1,
      message: "cannot add yourself as friend",
    };
    return;
  }
  const isFriend = await UserModel.findUnique({
    where: {
      id: userIdFromToken,
      friend: { has: id },
    },
  });
  if (isFriend) {
    ctx.body = {
      code: 1,
      message: "Already friend",
    };
    return;
  }
  // add friend
  const friend = await UserModel.update({
    where: { id: userIdFromToken },
    data: { friend: { push: id } },
  });
  const me = await UserModel.update({
    where: { id: id },
    data: { friend: { push: userIdFromToken } },
  });
  if (!friend || !me) {
    ctx.body = {
      code: 1,
      message: "cannot find friend in DB, Add friend failed",
    };
    return;
  }
  console.log(friend, me);

  // create room
  const roomResponse = await RoomModel.create({
    data: {
      // image,
      name: `PRIVATE_CHAT`,
      member: [userIdFromToken, id],
      creater: userIdFromToken,
      channelType: IChannelType.PRIVATE,
      readSeq: {},
    },
  });
  ctx.body = {
    code: 0,
    message: "Add friend success",
    data: roomResponse,
  };
}
/**
 * 删除好友.
 *
 * @param {*} ctx
 */
export async function DeleteFriend(ctx: Context) {
  if (getVerifiedToken(ctx)) {
    ctx.body = {
      code: 1,
      message: "cannot delete yourself as friend",
    };
  }
  ctx.body = {
    code: 0,
    message: "Delete friend success",
  };
}

export default {
  Login,
  Logout,
  Register,
  GetUserInfo,
  SetUserInfo,
  GetUserImage,
  QueryUser,
  AddFriend,
  DeleteFriend,
};
