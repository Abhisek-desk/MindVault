import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID, createHash, timingSafeEqual } from "crypto";
import mongoose from "mongoose";

import { User } from "../users/user.model";
import { registerSchema, loginSchema } from "./auth.validation";

// ========================================
// JWT CONFIGURATION
// ========================================

const JWT_ALGORITHM = "HS256" as const;

const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not loaded");
  }

  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not loaded");
  }

  return secret;
};

// ========================================
// TOKEN HELPERS
// ========================================

const hashRefreshToken = (token: string): string => {
  return createHash("sha256").update(token, "utf8").digest("hex");
};

const verifyRefreshToken = (
  token: string,
  storedHash: string,
): boolean => {
  if (
    typeof storedHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    return false;
  }

  const incomingHash = Buffer.from(hashRefreshToken(token), "hex");
  const existingHash = Buffer.from(storedHash, "hex");

  return timingSafeEqual(incomingHash, existingHash);
};

const isValidSessionPayload = (
  decoded: jwt.JwtPayload,
): decoded is jwt.JwtPayload & {
  sub: string;
  ver: number;
} => {
  return (
    typeof decoded.sub === "string" &&
    mongoose.isValidObjectId(decoded.sub) &&
    typeof decoded.ver === "number" &&
    Number.isSafeInteger(decoded.ver) &&
    decoded.ver >= 0
  );
};

// Supports users created before sessionVersion was added.
const getSessionVersionFilter = (version: number) => {
  if (version === 0) {
    return {
      $or: [
        { sessionVersion: 0 },
        { sessionVersion: { $exists: false } },
      ],
    };
  }

  return {
    sessionVersion: version,
  };
};

// ========================================
// COOKIE OPTIONS
// ========================================

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1",
};

const refreshCookieOptions = {
  ...accessCookieOptions,
  path: "/api/v1/auth",
};

const legacyRefreshCookieOptions = {
  ...accessCookieOptions,
  path: "/api/v1/auth/refresh",
};

// ========================================
// CREATE TOKENS
// ========================================

const createTokens = (
  userId: string,
  sessionVersion: number,
) => {
  const accessToken = jwt.sign(
    {
      sub: userId,
      ver: sessionVersion,
    },
    getAccessSecret(),
    {
      expiresIn: "15m",
      algorithm: JWT_ALGORITHM,
    },
  );

  const refreshToken = jwt.sign(
    {
      sub: userId,
      ver: sessionVersion,
      jti: randomUUID(),
    },
    getRefreshSecret(),
    {
      expiresIn: "7d",
      algorithm: JWT_ALGORITHM,
    },
  );

  return {
    accessToken,
    refreshToken,
  };
};

// ========================================
// SET AUTH COOKIES
// ========================================

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  // Remove the old, narrower refresh-cookie path.
  res.clearCookie("refreshToken", legacyRefreshCookieOptions);

  res.cookie("accessToken", accessToken, {
    ...accessCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...refreshCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ========================================
// CLEAR AUTH COOKIES
// ========================================

const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", accessCookieOptions);
  res.clearCookie("refreshToken", refreshCookieOptions);
  res.clearCookie("refreshToken", legacyRefreshCookieOptions);
};

// ========================================
// REGISTER
// ========================================

export const register = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration data",
      });
    }

    const {
      name,
      email,
      password,
      preferredLanguage,
    } = result.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      preferredLanguage,
    });

    const tokens = createTokens(
      user.id,
      user.sessionVersion,
    );

    user.refreshTokenHash = hashRefreshToken(
      tokens.refreshToken,
    );

    await user.save();

    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    if (
      error instanceof mongoose.Error.ValidationError ||
      (error as { code?: number })?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// ========================================
// LOGIN
// ========================================

export const login = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login data",
      });
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email }).select(
      "+passwordHash",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Atomically establish a new session version.
    const sessionUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $inc: { sessionVersion: 1 },
        $unset: { refreshTokenHash: 1 },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!sessionUser) {
      return res.status(401).json({
        success: false,
        message: "User account is no longer available",
      });
    }

    const tokens = createTokens(
      sessionUser.id,
      sessionUser.sessionVersion,
    );

    const newRefreshTokenHash = hashRefreshToken(
      tokens.refreshToken,
    );

    // Only the latest login can store its refresh token.
    const sessionResult = await User.updateOne(
      {
        _id: sessionUser._id,
        sessionVersion: sessionUser.sessionVersion,
      },
      {
        $set: {
          refreshTokenHash: newRefreshTokenHash,
        },
      },
    );

    if (sessionResult.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "A newer login has replaced this session. Please try again.",
      });
    }

    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        preferredLanguage: sessionUser.preferredLanguage,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ========================================
// REFRESH ACCESS TOKEN
// ========================================

export const refresh = async (
  req: Request,
  res: Response,
) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const decoded = jwt.verify(
      token,
      getRefreshSecret(),
      {
        algorithms: [JWT_ALGORITHM],
      },
    ) as jwt.JwtPayload;

    if (!isValidSessionPayload(decoded)) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(
      decoded.sub,
    ).select("+refreshTokenHash");

    if (
      !user ||
      !user.refreshTokenHash ||
      user.sessionVersion !== decoded.ver
    ) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Session has been invalidated",
      });
    }

    const previousHash = user.refreshTokenHash;

    if (!verifyRefreshToken(token, previousHash)) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const tokens = createTokens(
      user.id,
      user.sessionVersion,
    );

    const newRefreshTokenHash = hashRefreshToken(
      tokens.refreshToken,
    );

    // Atomic compare-and-swap prevents concurrent reuse.
    const rotationResult = await User.updateOne(
      {
        _id: user._id,
        refreshTokenHash: previousHash,
        ...getSessionVersionFilter(decoded.ver),
      },
      {
        $set: {
          refreshTokenHash: newRefreshTokenHash,
        },
      },
    );

    if (rotationResult.modifiedCount !== 1) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token has already been used",
      });
    }

    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return res.json({
      success: true,
      message: "Session refreshed",
    });
  } catch (error) {
    clearAuthCookies(res);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Session refresh failed",
    });
  }
};

// ========================================
// GET CURRENT USER
// ========================================

export const getMe = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not load user",
    });
  }
};

// ========================================
// LOGOUT
// ========================================

export const logout = async (
  req: Request,
  res: Response,
) => {
  try {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    let userId: string | null = null;
    let sessionVersion: number | null = null;
    let accessTokenIdentifiedSession = false;

    // A signed access token can identify its session for logout,
    // even when its 15-minute expiry has passed.
    if (accessToken) {
      try {
        const decoded = jwt.verify(
          accessToken,
          getAccessSecret(),
          {
            algorithms: [JWT_ALGORITHM],
            ignoreExpiration: true,
          },
        ) as jwt.JwtPayload;

        if (isValidSessionPayload(decoded)) {
          userId = decoded.sub;
          sessionVersion = decoded.ver;
          accessTokenIdentifiedSession = true;
        }
      } catch {
        // Fall back to refresh-token verification.
      }
    }

    // Use the refresh token only when no valid access-token
    // identity was established. Its stored hash must match.
    if (!accessTokenIdentifiedSession && refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          getRefreshSecret(),
          {
            algorithms: [JWT_ALGORITHM],
          },
        ) as jwt.JwtPayload;

        if (isValidSessionPayload(decoded)) {
          const user = await User.findById(
            decoded.sub,
          ).select("+refreshTokenHash");

          if (
            user &&
            user.refreshTokenHash &&
            user.sessionVersion === decoded.ver &&
            verifyRefreshToken(
              refreshToken,
              user.refreshTokenHash,
            )
          ) {
            userId = decoded.sub;
            sessionVersion = decoded.ver;
          }
        }
      } catch {
        // Invalid or expired refresh tokens cannot identify a session.
      }
    }

    if (userId && sessionVersion !== null) {
      await User.updateOne(
        {
          _id: userId,
          ...getSessionVersionFilter(sessionVersion),
        },
        {
          $inc: {
            sessionVersion: 1,
          },
          $unset: {
            refreshTokenHash: 1,
          },
        },
      );
    }

    clearAuthCookies(res);

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch {
    clearAuthCookies(res);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};