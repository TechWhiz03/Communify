import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  updateAccountDetails,
  changeCurrentPassword,
  updateAvatar,
  getCurrentUser,
  userStats,
  toggleFollow,
  friends,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.array("avatar", 1), registerUser);
router.route("/login").post(loginUser);

// secured routes [routes to be given to user only if logged in | login verification through "verifyJWT (auth) middleware"]
router.route("/refresh-token").post(refreshAccessToken); // token verified in controller itself hence no "verifyJWT middleware" required
router
  .route("/update-account-details/:id")
  .patch(verifyJWT, updateAccountDetails);
router.route("/change-password/:id").post(verifyJWT, changeCurrentPassword);

router
  .route("/update-avatar/:id")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);

router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/user-stats").get(verifyJWT, userStats);
router.route("/toggle-follow/:id").patch(verifyJWT, toggleFollow);
router.route("/get-friends").get(verifyJWT, friends);

export default router;
