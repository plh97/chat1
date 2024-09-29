// import { Schema, Model } from "mongoose";
// import { IMessage } from "@/interface";

// const schema = new Schema<IMessage>({
//   user: { type: Schema.Types.ObjectId, ref: "User" },
//   createdAt: { type: Schema.Types.Date, default: Date.now },
//   seq: { type: Schema.Types.Number, required: true },
//   contentType: { type: Schema.Types.Number, required: true },
//   channelId: { type: Schema.Types.String, required: true },
//   textMessage: undefined || {
//     text: String,
//     methion: [],
//   },
//   mediaMessage: undefined || {
//     url: String,
//     width: Number,
//     height: Number,
//     thumbnail: String,
//     extension: String,
//     name: String,
//     size: Number,
//     fileType: String,
//     duration: Number,
//   },
// });

// class ModelClass extends Model {
//   static async findAndReplaceUserInfo({ index = 0, pageSize = 20 }) {
//     const totalCount = await this.collection.count();
//     if (totalCount == index) {
//       return [];
//     }
//     return this.find({})
//       .skip(
//         totalCount - pageSize - index > 0 ? totalCount - pageSize - index : 0
//       )
//       .limit(
//         totalCount - pageSize - index < 0
//           ? totalCount - index
//           : Number(pageSize)
//       )
//       .populate("user");
//   }
// }

// schema.loadClass(ModelClass);

// export const MessageModel = model<IMessageCore>("Message", schema);

import { prisma } from "db";

export const MessageModel = prisma.message;
