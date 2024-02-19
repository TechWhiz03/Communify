import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(upload.array("avatar", 1), registerUser);
router.route("/login").post(loginUser);

// secured routes [routes to be given to user only if logged in | login verification through "verifyJWT (auth) middleware"]
router.route("/refresh-token").post(refreshAccessToken); // token verified in controller itself hence no "verifyJWT middleware" required

export default router;
