import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
  {
    postFile: {
      publicId: {
        type: String, // cloudinary url
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    thumbnail: {
      publicId: {
        type: String, // cloudinary url
      },
      url: {
        type: String,
      },
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // from cloudinary
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Post = mongoose.model("Post", postSchema);
