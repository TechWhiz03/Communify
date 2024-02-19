import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// to set up the Cloudinary SDK in a Node.js application.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// to upload file from local storage to cloudinary server.
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload file to cloudinary.
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "Communify", // Cloudinary folder name
    });

    // console.log("File uploaded on Cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.log("message", error);
    fs.unlinkSync(localFilePath); // remove locally saved temporary file as upload operation failed.
    return null;
  }
};

// to remove previous file from cloudinary server
const deleteOnCloudinary = async (publicId) => {
  if (!publicId) return null;

  // console.log(publicId);
  try {
    // Use Cloudinary API to delete the file by publicId
    const result = await cloudinary.uploader.destroy(publicId);

    // console.log("Result: ", result);
    // Check the result to ensure successful deletion
    if (result !== "ok") {
      console.log(
        `Error deleting file with public_id: ${publicId} from Cloudinary.`
      );
    }
  } catch (error) {
    console.log(
      `Error deleting file with public_id ${publicId} from Cloudinary:`,
      error.message
    );
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
