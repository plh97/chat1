import { Context } from "koa";
import jwt from "jsonwebtoken";
import { privateKey } from "@/config";
import { RoomModel } from "@/model/room";
import { UserModel, IUser } from "@/model/user";
import { isValidObjectId, Types } from "mongoose";
import { getVerifiedToken } from "@/utils/token";
import { IChannelType, IRoom } from "@chatroom/core";

/**
 * get user info through cookie
 * @param {*} ctx
 */
export async function GetUserInfo(ctx: Context) {
  const cookie = ctx.cookies.get("token") ?? "";
  const _id = jwt.verify(cookie, privateKey) as string;
  const userinfo = await UserModel.findOne({ _id }).populate("friend");
  if (userinfo) {
    const room = await RoomModel.find({ member: { $in: _id } })
      .sort('-updatedAt')
      .populate("member")
      .populate("admin")
      .populate("message");
    ctx.body = {
      code: 0,
      data: {
        ...userinfo.toJSON(),
        room: room.map((_room) => {
          const room = _room.toJSON();
          return Object.assign(room, {
            lastMsg: room.message[room.message.length - 1],
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
  const { image } = ctx.request.body;
  const cookie = ctx.cookies.get("token") ?? "";
  const _id = jwt.verify(cookie, privateKey);
  await UserModel.updateOne({ _id }, { $set: { image } });
  const userinfo = await UserModel.findOne({ _id })
    .populate("friend")
    .populate("room");
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
  const username = ctx.request.query.username;
  if (username) {
    const userinfo: IUser | null = await UserModel.findOne({
      username: { $eq: username },
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
  const { username = "" } = ctx.request.query;
  if (username) {
    const users = await UserModel.find({
      username: { $eq: username },
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
  const userinfo = await UserModel.findOne({ username, password });
  if (userinfo) {
    const token = jwt.sign(String(userinfo._id), privateKey);
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
  const userInfo = await UserModel.findOne({ username });
  if (userInfo) {
    ctx.body = {
      code: 1,
      message: "This account is already occupied!",
    };
  } else {
    const userinfo = await UserModel.create({
      username,
      password,
    });
    const token = jwt.sign(String(userinfo._id), privateKey);
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
  const _id = String(ctx.request.body._id) ?? "";
  if (!_id || !isValidObjectId(_id)) {
    ctx.body = {
      code: 1,
      message: "_id incorrect",
    };
    return;
  }
  // const { image } = ctx.request.body;
  const cookie = ctx.cookies.get("token") ?? "";
  const userIdFromToken = jwt.verify(cookie, privateKey) as string;
  const token = getVerifiedToken(ctx);
  if (_id === userIdFromToken) {
    ctx.body = {
      code: 1,
      message: "cannot add yourself as friend",
    };
    return;
  }
  const isFriend = await UserModel.findOne({
    _id: userIdFromToken,
    friend: { $in: { _id: new Types.ObjectId(_id) } },
  });
  if (isFriend) {
    ctx.body = {
      code: 1,
      message: "Already friend",
    };
    return;
  }
  // add friend
  const friend = await UserModel.findByIdAndUpdate(
    { _id: new Types.ObjectId(userIdFromToken) },
    { $addToSet: { friend: new Types.ObjectId(_id) } }
  );
  const me = await UserModel.findByIdAndUpdate(
    { _id: new Types.ObjectId(_id) },
    { $addToSet: { friend: new Types.ObjectId(userIdFromToken) } }
  );

  if (!friend || !me) {
    ctx.body = {
      code: 1,
      message: "cannot find friend in DB, Add friend failed",
    };
    return;
  }
  console.log(friend, me);

  // create room
  const roomResponse = await RoomModel.create<Partial<IRoom>>({
    // image,
    name: `PRIVATE_CHAT`,
    member: [userIdFromToken, _id],
    creater: new Types.ObjectId(userIdFromToken),
    channelType: IChannelType.PRIVATE,
  });
  // update myself into a room id
  // update otherpersion into userid
  // await UserModel.updateOne(
  //   { _id: new Types.ObjectId(userIdFromToken) },
  //   { $addToSet: { room: roomResponse } }
  // );
  // await UserModel.updateOne(
  //   { _id: new Types.ObjectId(_id) },
  //   { $addToSet: { room: roomResponse } }
  // );
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
