import mongoose, { isValidObjectId } from "mongoose";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

// Publish Post
const publishAPost = asyncHandler(async (req, res) => {
  if (req.user._id == req.params.ownerId || req.user.isAdmin) {
    // get post, upload to cloudinary, create post
    const { title, description, isPublished = "true" } = req.body;

    if ([title, description].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "Title & Description required");
    }

    // post file and thumbnail handling
    const postFileLocalPath = req.files?.postFile?.[0].path;
    const thumbnailFileLocalPath = req.files?.thumbnail?.[0].path;

    if (!postFileLocalPath) {
      throw new ApiError(400, "Post file is missing");
    }

    // upload on cloudinary
    const postFile = await uploadOnCloudinary(postFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath);
    if (!postFile) {
      throw new ApiError(400, "Error uploading on Cloudinary");
    }

    // create post obj
    const post = await Post.create({
      postFile: {
        publicId: postFile?.public_id,
        url: postFile?.url,
      },
      thumbnail: {
        publicId: thumbnail?.public_id || "",
        url: thumbnail?.url || "",
      },
      title,
      description,
      isPublished,
      duration: postFile?.duration || "",
      owner: req.user._id,
    });

    if (!post) {
      throw new ApiError(
        500,
        "Something went wrong while storing the post in database"
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(201, post, "Post Uploaded Successfully!!"));
  } else {
    throw new ApiError(403, "Allowed to add post only to your account");
  }
});

// Get User's Posts
const getUserPosts = asyncHandler(async (req, res) => {
  const userId = req.params.ownerId;

  // find user in db
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // find user posts
  const userPosts = await Post.find({ owner: userId });

  // find friend's posts
  const friendPosts = await Promise.all(
    //Promise.all() to fetch posts from all the friends of a current user.
    //Promise.all() allows you to wait for multiple promises to be resolved at the same time and get the results back as an array.
    user.following.map((friendId) => {
      //map() method is used to loop through the array and return an array of promises.
      //map() method allows you to take each item in the array, do something with it, and store the results in a new array.
      return Post.find({ user: friendId });
    })
  );

  try {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          userPosts.concat(friendPosts),
          "Fetched all posts successfully !!"
        )
      );
  } catch (error) {
    throw new ApiError(400, "Cannot get posts");
  }
});

//Get Post By Id
const getPostById = asyncHandler(async (req, res) => {
  const postId = req.params.postId;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "This post id is not valid");
  }

  // const video = await Video.findById(postId);

  let post = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        likes: {
          $size: "$likes",
        },
        views: {
          $add: [1, "$views"],
        },
      },
    },
  ]);

  if (post.length > 0) {
    post = post[0];
  }

  await Post.findByIdAndUpdate(postId, {
    $set: {
      views: post.views,
    },
  });

  if (!post || post.length === 0) {
    throw new ApiError(404, "Post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post fetched successfully!!"));
});

// Update Post Details
const updatePost = asyncHandler(async (req, res) => {
  const postId = req.params.postId;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "This post id is not valid");
  }

  if (!(title && description)) {
    throw new ApiError(400, "Title & Description fields are required");
  }

  let updateFields = {
    $set: {
      title,
      description,
    },
  };

  // to update thumbnail
  const post = await Post.findById(postId);

  // if thumbnail provided delete the previous one and upload new
  let thumbnail;
  if (thumbnailLocalPath) {
    await deleteOnCloudinary(post.thumbnail?.publicId);

    // upload new one
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
      throw new ApiError(
        500,
        "Something went wrong while updating thumbnail on cloudinary !!"
      );
    }

    // thumbnail fields are merged to the existing $set object using the spread operator (...)
    updateFields.$set = {
      ...updateFields.$set,
      thumbnail: {
        publicId: thumbnail.public_id,
        url: thumbnail.url,
      },
    };
  }

  let updatePostDetails;
  if (req.user._id.toString() === post.owner.toString() || req.user.isAdmin) {
    updatePostDetails = await Post.findByIdAndUpdate(postId, updateFields, {
      new: true,
    });
  } else {
    throw new ApiError(400, "Allowed to update only your post ");
  }

  if (!updatePostDetails) {
    throw new ApiError(500, "Something went wrong while updating post details");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatePostDetails,
        "Post details updated successfully!"
      )
    );
});

// Delete Post
const deletePost = asyncHandler(async (req, res) => {
  const postId = req.params.postId;
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "This post id is not valid");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "post not found");
  }

  if (post.owner.toString() !== req.user._id.toString() || req.user.isAdmin) {
    throw new ApiError(403, "You are not allowed to delete this post!");
  }

  const { _id, postFile, thumbnail } = post;

  // find comments associated with postId
  const comments = await Comment.find({ post: _id });

  // extracts an array of comment ids from the fetched comments.
  const commentIds = comments.map((comment) => comment._id);

  const delResponse = await Post.findByIdAndDelete(_id);
  if (delResponse) {
    // Promise.all() handle multiple asynchronous operations concurrently and
    // ensures that either all deletion operations succeed or none of them do.
    await Promise.all([
      // delete the instances of video from like collections
      Like.deleteMany({ post: _id }),

      // deletes all comment likes where the comment field matches any of the comment ids in the commentIds array
      Like.deleteMany({ comment: { $in: commentIds } }),

      // delete the instances of post from comment collections
      Comment.deleteMany({ post: _id }),

      // delete post and thumbnail in cloudinary
      deleteOnCloudinary(postFile.publicId),
      deleteOnCloudinary(thumbnail.publicId),
    ]);
  } else {
    throw new ApiError(500, "Something went wrong while deleting post");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "post deleted successfully!!"));
});

//Toggle Publish Status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const postId = req.params.postId;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "This post id is not valid");
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new ApiError(404, "post not found");
  }

  if (post.owner.toString() !== req.user._id.toString() || req.user.isAdmin) {
    throw new ApiError(403, "You don't have permission to toggle this post!");
  }

  // toggle post status
  post.isPublished = !post.isPublished;

  await post.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post toggle successfull!!"));
});

export {
  publishAPost,
  getUserPosts,
  getPostById,
  updatePost,
  deletePost,
  togglePublishStatus,
};
