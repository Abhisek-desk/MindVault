import {
  Request,
  Response,
  NextFunction
} from "express";

import jwt from "jsonwebtoken";

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

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      console.error(
        "JWT_ACCESS_SECRET is not configured"
      );

      return res.status(500).json({
        success: false,
        message: "Authentication service unavailable"
      });
    }

    const decoded = jwt.verify(
      token,
      secret,
      {
        algorithms: [JWT_ALGORITHM]
      }
    ) as jwt.JwtPayload;

    if (typeof decoded.sub !== "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
    }

    req.userId = decoded.sub;

    return next();

  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session"
    });
  }
};