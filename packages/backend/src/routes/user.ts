import { Context } from "koa";
import jwt from "jsonwebtoken";
import { CookieConfig, privateKey } from "@/config";
import { RoomModel } from "@/model/room";
import { UserModel } from "@/model/user";
import { getVerifiedToken } from "@/utils/token";
import { WS_EVENT } from "core";
import { onMsgReceive } from "@/ws";
import { IMessage, IUser } from "@/interface";

/**
 * get user info through cookie
 * @param {*} ctx
 */
export async function GetUserInfo(ctx: Context) {
  const cookie = ctx.cookies.get("token") ?? "";
  const id = jwt.verify(cookie, privateKey) as string;
  const userinfo = await UserModel.findUnique({
    where: { id },
    include: {
      friend: true,
      // room: true,
    },
  });
  if (userinfo) {
    const room = await RoomModel.findMany({
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],
      where: { memberId: { has: id } },
      include: {
        message: true,
        member: true,
      },
    });
    // .sort("-updatedAt")
    // .populate("admin")
    ctx.body = {
      code: 0,
      data: {
        ...userinfo,
        room: room.map((r: any) => {
          return Object.assign(r, {
            totalCount: r.message.length,
            lastMsg: r.message[r.message.length - 1],
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
  const userInfo = ctx.request.body as IUser;
  const cookie = ctx.cookies.get("token") ?? "";
  const id = jwt.verify(cookie, privateKey) as string;
  await UserModel.update({
    where: { id },
    data: userInfo,
  });
  const userinfo = await UserModel.findUnique({
    where: { id },
    include: {
      friend: true,
      // room: true,
    },
  });
  if (!userinfo) {
    ctx.body = {
      code: 0,
    };
    return;
  }
  ctx.body = {
    code: 0,
    data: userinfo,
  };
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
      message: "Please provide info to query user information.",
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
    ctx.cookies.set("token", token, CookieConfig);
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
    const token = jwt.sign(String(userinfo.id), privateKey);
    ctx.cookies.set("token", token, CookieConfig);
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
  const id = String(ctx.request.body.id) || "";
  if (!id) {
    ctx.body = {
      code: 1,
      message: "id incorrect",
    };
    return;
  }
  const cookie = ctx.cookies.get("token") ?? "";
  const userIdFromToken = jwt.verify(cookie, privateKey) as string;
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
      friendId: { has: id },
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
  const me = await UserModel.update({
    where: { id: userIdFromToken },
    data: { friendId: { push: id } },
  });
  const friend = await UserModel.update({
    where: { id: id },
    data: { friendId: { push: userIdFromToken } },
  });
  if (!friend || !me) {
    ctx.body = {
      code: 1,
      message: "cannot find friend in DB, Add friend failed",
    };
    return;
  }
  // create room
  const newRoom = await RoomModel.create({
    data: {
      name: `PRIVATE_CHAT`,
      memberId: [me.id, friend.id],
      creatorId: me.id,
      channelType: "PRIVATE",
      readSeq: {},
    },
  });
  const data = {
    seq: 1,
    contentType: "SYSTEM_MESSAGE",
    userId: newRoom.creatorId,
    channelId: newRoom.id,
    systemMessage: {
      targetList: [friend.id],
      operator: me.id,
      actionType: "ADD_FRIEND",
    },
  } as IMessage;
  onMsgReceive(
    {
      event: WS_EVENT.SEND_MSG,
      data,
      requestId: "",
      message: "",
      code: 0,
    },
    ctx.ws
  );
  ctx.body = {
    code: 0,
    message: "Add friend success",
    data: newRoom,
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
