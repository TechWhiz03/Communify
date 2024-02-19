import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true, // leading or trailing whitespace will be removed
      index: true, // improves the speed of searching/sorting queries based on the username
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    mob: {
      type: String,
      required: true,
      minlength: [10, "Mobile no must 10 digits or more"],
      maxlength: 15,
    },
    bio: {
      type: String,
    },
    avatar: {
      publicId: {
        type: String, // cloudinary url
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    followers: {
      type: Array,
      default: [],
    },
    following: {
      type: Array,
      default: [],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// pre hooks are middleware functions defined to execute before a particular operation (such as save, validate, remove, etc.)
// is performed on a document within a Mongoose schema.For instance, before saving a document to hash a password.
// avoid using arrow function as callback as 'this' keyword is used.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);

  // next() allows the middleware to proceed to the next function in the middleware chain or
  // to move on to the next step in the Mongoose operation(such as saving the document).
  next();
});

// creates custom method for our schema that checks if a provided password matches the stored hashed password.
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// custom methods for Access & Refresh Token generation
// no async since very fast access
userSchema.methods.generateAccessToken = function () {
  // sign() method generates JWT
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
