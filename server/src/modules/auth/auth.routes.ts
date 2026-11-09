import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  register,
  login,
  refresh,
  getMe,
  logout
} from "./auth.controller";

import { protect } from "../../middleware/auth.middleware";

const router = Router();

// Login: maximum 10 attempts per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

// Registration: maximum 5 attempts per hour.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later."
  }
});

// Token refresh: maximum 30 attempts per 15 minutes.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many session refresh requests. Please try again later."
  }
});

router.post("/register", registerLimiter, register);

router.post("/login", loginLimiter, login);

router.post("/refresh", refreshLimiter, refresh);

router.get("/me", protect, getMe);

router.post("/logout", protect, logout);

export default router;