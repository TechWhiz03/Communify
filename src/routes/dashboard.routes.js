import { Router } from "express";
import {
  userStats,
  getProfileStats,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/user-stats").get(verifyJWT, userStats);
router.route("/profile-stats/:userId").get(getProfileStats);

export default router;
