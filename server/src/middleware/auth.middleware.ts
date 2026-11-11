import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";
import { User } from "../modules/users/user.model";
import mongoose from "mongoose";

// ========================================
// EXPRESS REQUEST TYPE
// ========================================

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// ========================================
// JWT CONFIGURATION
// ========================================

const JWT_ALGORITHM = "HS256" as const;

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      console.error("JWT_ACCESS_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    }) as jwt.JwtPayload;

    if (
      typeof decoded.sub !== "string" ||
      !mongoose.isValidObjectId(decoded.sub) ||
      typeof decoded.ver !== "number" ||
      !Number.isSafeInteger(decoded.ver) ||
      decoded.ver < 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // Verify that the token belongs to the current session.
    const user = await User.findById(decoded.sub).select("sessionVersion");

    if (!user || user.sessionVersion !== decoded.ver) {
      return res.status(401).json({
        success: false,
        message: "Session has expired or been invalidated",
      });
    }

    req.userId = user.id;

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    console.error("Authentication verification failed.");

    return res.status(500).json({
      success: false,
      message: "Authentication service unavailable",
    });
  }
};
