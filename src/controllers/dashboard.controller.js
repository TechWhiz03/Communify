import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get User Stats
const userStats = asyncHandler(async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $project: {
          //Projects the month & year field from the createdAt field of each document.
          year: { $year: "$createdAt" }, // Extract year from createdAt field
          month: { $month: "$createdAt" }, // Return 1 for Jan, 2 for Feb, ...
        },
      },
      {
        $group: {
          //Groups the doc by year & month
          _id: { year: "$year", month: "$month" },
          total: { $sum: 1 }, // Returns total users per month
        },
      },
      {
        $project: {
          _id: 0, // Specifies to exclude the _id field from the output
          year: "$_id.year", // Extracts the year field from the _id field and renames it as year.
          month: "$_id.month",
          total: 1, // Specifies to include the total field in the output.
        },
      },
    ]);
    return res
      .status(200)
      .json(new ApiResponse(200, stats, "User Stats fetched successfully"));
  } catch (err) {
    throw new ApiError(500, err.message);
  }
});

// Get the user profile stats like total post views, total posts, total likes etc.
const getProfileStats = asyncHandler(async (req, res) => {
  const data = await Post.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.params.userId),
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
        PostLikes: {
          $size: "$likes",
        },
      },
    },
    // In "$group" stage, the "_id" field specifies the criteria for grouping documents.
    // When _id is set to null, it means all documents will be grouped together as a single group.
    // allowing you to perform aggregate operations on the entire collection without considering individual field values for grouping.
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: "$views",
        },
        totalPosts: {
          // "$sum: 1" calculates the total count of documents that satisfy the grouping condition
          $sum: 1,
        },
        totaLikes: {
          $sum: "$likes",
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  const user = await User.findById(req.params.userId);
  const friends = await Promise.all(
    user.following.map((friendId) => {
      return User.findById(friendId);
    })
  );
  let friendList = [];
  friends.map((friend) => {
    const { username } = friend;
    friendList.push({ username });
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        data.concat(friendList),
        "Get profile stats successfull"
      )
    );
});

export { userStats, getProfileStats };
