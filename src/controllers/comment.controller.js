import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Add comment to a post
const addComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const { postId } = req.params;

  if (!comment || comment?.trim() === "") {
    throw new ApiError(400, "comment is required");
  }

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "This post id is not valid");
  }

  const postComment = await Comment.create({
    comment: comment,
    post: postId,
    owner: req.user._id,
  });

  if (!postComment) {
    throw new ApiError(
      500,
      "Something went wrong while creating video comment"
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, postComment, "Post comment created successfully!!")
    );
});

// Get all comments for a video
const getPostComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "This post id is not valid");
  }

  // find post in database
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "post not found");
  }

  // match and finds all the comments for postId
  const aggregateComments = await Comment.aggregate([
    {
      $match: {
        post: new mongoose.Types.ObjectId(postId),
      },
    },
  ]);

  try {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          aggregateComments,
          "post Comments fetched  successfully!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while fetching post Comments",
      error.message
    );
  }
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { newComment } = req.body;
  const { commentId } = req.params;

  if (!newComment || newComment?.trim() === "") {
    throw new ApiError(400, "comment is required");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "This comment id is not valid");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "comment not found!");
  }

  if (
    comment.owner.toString() !== req.user._id.toString() ||
    req.user.isAdmin
  ) {
    throw new ApiError(
      403,
      "You don't have permission to update this comment!"
    );
  }

  const updateComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        comment: newComment,
      },
    },
    {
      new: true,
    }
  );

  if (!updateComment) {
    throw new ApiError(500, "something went wrong while updating comment");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updateComment, "comment updated successfully!!")
    );
});

// Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "This comment id is not valid");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "comment not found!");
  }

  if (
    comment.owner.toString() !== req.user._id.toString() ||
    req.user.isAdmin
  ) {
    throw new ApiError(
      403,
      "You don't have permission to delete this comment!"
    );
  }

  const deleteComment = await Comment.findByIdAndDelete(comment._id);
  if (deleteComment) {
    // delete comment instance from like collection
    await Like.deleteMany({ comment: commentId });
  }
  if (!deleteComment) {
    throw new ApiError(500, "something went wrong while deleting comment");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, deleteComment, "Comment deleted successfully!!")
    );
});

export { getPostComments, addComment, updateComment, deleteComment };
