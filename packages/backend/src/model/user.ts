import { Schema, Model, model, Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  image: string;
  username: string;
  password: string;
  bio: string;
  qq: string;
  wechat: string;
  github: string;
  permission: string;
  friend: IUser[];
}

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

export const UserModel = model<IUser>("User", schema);
