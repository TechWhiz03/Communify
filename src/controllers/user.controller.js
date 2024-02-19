import validator from "validator";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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
  const { username, email, fullName, password, mob, bio } = req.body;

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
  });

  // check user creation & response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering");
  }

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

export { registerUser, loginUser, refreshAccessToken };
