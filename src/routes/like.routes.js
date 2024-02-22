import { Router } from "express";
import {
  toggleCommentLike,
  togglePostLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/post/:postId").post(togglePostLike);
router.route("/toggle/comment/:commentId").post(toggleCommentLike);

export default router;
