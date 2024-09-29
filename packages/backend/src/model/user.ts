import { IUser } from "@/interface";
import { Schema, Model } from "mongoose";

const schema = new Schema<IUser>({
  image: { type: String, default: "" },
  username: String,
  password: { type: String, required: true, select: false },
  bio: String,
  qq: String,
  wechat: String,
  github: String,
  permission: String,
  friend: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

class ModelClass extends Model {
  static saveOne(body: IUser) {
    return this.create(body);
  }
}

schema.loadClass(ModelClass);

import { prisma } from "db";

export const UserModel = prisma.user;
