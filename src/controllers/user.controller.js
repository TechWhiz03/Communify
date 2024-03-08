import validator from "validator";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendEmail } from "../utils/nodemailer.js";
import jwt from "jsonwebtoken";

// Method to generate Access & Refresh tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // 'validateBeforeSave:false'  skips validation on the data before saving

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating access and refresh tokens");
  }
};

// Register User
const registerUser = asyncHandler(async (req, res) => {
  // get user details
  const { username, email, fullName, password, mob, bio, isAdmin } = req.body;

  // validation for not empty
  if (
    [username, email, fullName, password, mob, bio].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // valdiates email
  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Invalid Email !");
  }

  // check for existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists !");
  }

  // image handling at our server
  const avatarLocalPath = req.files?.map((avatar) => avatar.path).join(", ");
  // join(', ') concatenates all the elements of the array into a single string

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create user obj
  const user = await User.create({
    username: username.toLowerCase(), // stores username in lowercase
    email,
    fullName,
    password,
    mob,
    bio,
    avatar: { publicId: avatar?.public_id, url: avatar?.url }, // cloudinary url
    isAdmin: isAdmin || "false",
  });

  // check user creation & response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering");
  }

  // send email notification
  await sendEmail({
    emailId: email,
    subject: "Registered Successfully",
    message: `Hello ${fullName}, you have successfully registered to Communify`,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "Registration Successful"));
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  // data
  const { username, email, password } = req.body;

  //check username and email
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  // find user thro username or email
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // check password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // either update 'user' instance or again make a call to DB since the older instance doesn't contain refresh token
  const loggedInUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        accessToken, // access and refresh token sent seperately if the user wants to store them locally
        refreshToken,
      },
      "User logged in successfully"
    )
  );
});

// Refreshing Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get refreshToken
  const incomingRefreshToken = req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // decode
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // get user
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // verify with user's token
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or invalid");
    }

    // generate new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "Access token refreshed"
      )
    );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Update Account Details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, mob, bio } = req.body; // fields user can update

  if (!(fullName && email && mob && bio)) {
    throw new ApiError(400, "All fields are required");
  }

  if (req.user._id == req.params.id || req.user.isAdmin) {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          fullName,
          email,
          mob,
          bio,
        },
      },
      {
        new: true,
      }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"));
  } else {
    throw new ApiError(403, "Allowed to update only your account");
  }
});

// Change Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  if (req.user._id == req.params.id || req.user.isAdmin) {
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password updated successfully"));
  } else {
    throw new ApiError(403, "Allowed to update only your account");
  }
});

// Update Avatar
const updateAvatar = asyncHandler(async (req, res) => {
  if (req.user._id == req.params.id || req.user.isAdmin) {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file missing");
    }

    // Get user's avatar information before updation
    const currentUser = await User.findById(req.user?._id).select(
      "-password -refreshToken"
    );
    const previousAvatarId = currentUser.avatar.publicId;

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
      throw new ApiError(400, "Error while uploading avatar on cloudinary");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: { publicId: avatar?.public_id, url: avatar?.url },
        },
      },
      { new: true }
    ).select("-password");

    // Delete previous avatar on Cloudinary if it exists
    if (previousAvatarId) {
      await deleteOnCloudinary(previousAvatarId);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar updated successfully"));
  } else {
    throw new ApiError(403, "Allowed to update only your account");
  }
});

// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched successfully"));
});

// Toggle Following a Friend
const toggleFollow = asyncHandler(async (req, res) => {
  if (req.user._id !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      if (user) {
        const name = user.username;
        const currentUser = await User.findById(req.user._id);
        if (!user.followers.includes(req.user._id)) {
          await user.updateOne({ $push: { followers: req.user._id } });
          await currentUser.updateOne({ $push: { following: req.params.id } });
          return res
            .status(200)
            .json(new ApiResponse(200, `Following ${name}`));
        } else {
          await user.updateOne({ $pull: { followers: req.user._id } });
          await currentUser.updateOne({ $pull: { following: req.params.id } });
          return res
            .status(200)
            .json(new ApiResponse(200, `Unfollowed ${name}`));
        }
      } else {
        throw new ApiError(500, "Id not found");
      }
    } catch (err) {
      throw new ApiError(500, err.message);
    }
  } else {
    throw new ApiError(403, "You can't follow yourself");
  }
});

// Get Friends
const friends = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const friends = await Promise.all(
      user.following.map((friendId) => {
        return User.findById(friendId);
      })
    );
    let friendList = [];
    friends.map((friend) => {
      const { _id, username, avatar } = friend;
      friendList.push({ _id, username, avatar });
    });
    return res
      .status(200)
      .json(new ApiResponse(200, friendList, "Friends returned successfully"));
  } catch (err) {
    throw new ApiError(500, err.message);
  }
});

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  updateAccountDetails,
  changeCurrentPassword,
  updateAvatar,
  getCurrentUser,
  toggleFollow,
  friends,
};
