import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// authentication of user
// "_" is used since "res" was not required/in use
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");
    // console.log(token);

    if (!token) {
      throw new ApiError(401, "Unauthorized access");
    }

    // decode token info: _id, email, username, fullName  [payload in the token]
    const decodedTokenInformation = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    // get user from decoded token
    const user = await User.findById(decodedTokenInformation?._id).select(
      " -password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // assigning the user object to req.user
    // By doing this, the user's details are now attached to the req object.
    // Subsequent middleware func or route handlers along the request-response cycle can access this user info using "req.user"
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
