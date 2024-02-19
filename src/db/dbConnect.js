import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log("MongoDB Connected");
  } catch (error) {
    console.log("MONGODB Connection Failed: ", error);
    process.exit(1); // abnormal termination of process due to connection failure
  }
};

export default connectDB;
