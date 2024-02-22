import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Toggle like on post
const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "This post id is not valid");
  }

  // find post alredy liked or not
  const postLike = await Like.findOne({
    post: postId,
  });

  let like;
  let unlike;

  if (postLike) {
    unlike = await Like.deleteOne({
      post: postId,
    });

    if (!unlike) {
      throw new ApiError(500, "something went wrong while unlike post !!");
    }
  } else {
    like = await Like.create({
      post: postId,
      likedBy: req.user._id,
    });

    if (!like) {
      throw new ApiError(500, "something went wrong while like post !!");
    }
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {},
        `User ${like ? "like" : "Unlike"} post successfully !!`
      )
    );
});

// Toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "This comment id is not valid");
  }

  // find comment alredy liked or not
  const commentLike = await Like.findOne({
    comment: commentId,
  });

  let like;
  let unlike;

  if (commentLike) {
    unlike = await Like.deleteOne({
      comment: commentId,
    });

    if (!unlike) {
      throw new ApiError(500, "something went wrong while unlike comment !!");
    }
  } else {
    like = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });

    if (!like) {
      throw new ApiError(500, "something went wrong while like comment !!");
    }
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {},
        `User ${like ? "like" : "Unlike"} comment successfully !!`
      )
    );
});

export { togglePostLike, toggleCommentLike };
