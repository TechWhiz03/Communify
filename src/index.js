import dotenv from "dotenv";
import connectDB from "./db/dbConnect.js";
import { app } from "./app.js";

dotenv.config({ path: "./.env" }); // makes sure env variables are initialized as soon as app is loaded

// DB connection
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(`MONGODB Connection Error: ${err}`);
  });
