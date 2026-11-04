import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as jwt.JwtPayload;

    if (typeof decoded.sub !== "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
    }

    req.userId = decoded.sub;

    next();

  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session"
    });
  }
};