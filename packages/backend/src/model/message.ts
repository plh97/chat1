import { Schema, Model, model } from "mongoose";
import { IUser } from "@/model/user";
import { IMessage } from "@chatroom/core";

export interface IIMessage extends IMessage {
  user: IUser;
}

const schema = new Schema<IIMessage>({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Schema.Types.Date, default: Date.now },
  seq: { type: Schema.Types.Number, required: true },
  readSeq: { type: Schema.Types.Number, required: true },
  contentType: { type: Schema.Types.Number, required: true },
  channelId: { type: Schema.Types.String, required: true },
  textMessage: undefined || {
    text: String,
    methion: [],
  },
  mediaMessage: undefined || {
    url: String,
    width: Number,
    height: Number,
    thumbnail: String,
    extension: String,
    name: String,
    size: Number,
    fileType: String,
    duration: Number,
  },
});

class ModelClass extends Model {
  static async findAndReplaceUserInfo({ index = 0, pageSize = 20 }) {
    const totalCount = await this.collection.count();
    if (totalCount == index) {
      return [];
    }
    return this.find({})
      .skip(
        totalCount - pageSize - index > 0 ? totalCount - pageSize - index : 0
      )
      .limit(
        totalCount - pageSize - index < 0
          ? totalCount - index
          : Number(pageSize)
      )
      .populate("user");
  }
}

schema.loadClass(ModelClass);

export const MessageModel = model<IMessage>("Message", schema);
