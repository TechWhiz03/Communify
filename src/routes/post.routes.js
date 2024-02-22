import { Router } from "express";
import {
  publishAPost,
  getUserPosts,
  getPostById,
  updatePost,
  deletePost,
  togglePublishStatus,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
  .route("/owner/:ownerId")
  .get(getUserPosts)
  .post(
    upload.fields([
      {
        name: "postFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishAPost
  );

router
  .route("/:postId")
  .get(getPostById)
  .patch(upload.single("thumbnail"), updatePost)
  .delete(deletePost);

router.route("/toggle/publish/:postId").patch(togglePublishStatus);

export default router;
