import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID, createHash, timingSafeEqual } from "crypto";

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
// REFRESH TOKEN HASHING
// ========================================

// SHA-256 hashes the entire refresh token.
// Unlike bcrypt, SHA-256 does not truncate long JWTs.

const hashRefreshToken = (token: string): string => {
  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
};

// Compare hashes using constant-time comparison.

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

  const incomingHash = Buffer.from(
    hashRefreshToken(token),
    "hex",
  );

  const existingHash = Buffer.from(
    storedHash,
    "hex",
  );

  return timingSafeEqual(incomingHash, existingHash);
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
  path: "/api/v1/auth/refresh",
};

// ========================================
// CREATE TOKENS
// ========================================

const createTokens = (userId: string) => {
  const accessToken = jwt.sign(
    {
      sub: userId,
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
        message: "Invalid registration details",
      });
    }

    const { name, email, password } = result.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    const tokens = createTokens(user.id);

    // Store SHA-256 hash of the refresh token.
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
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    console.error("Registration error:", error);

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
        message: "Invalid login details",
      });
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email }).select(
      "+passwordHash +refreshTokenHash",
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

    const tokens = createTokens(user.id);

    // Replace any previous refresh session.
    user.refreshTokenHash = hashRefreshToken(
      tokens.refreshToken,
    );

    await user.save();

    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

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

    if (typeof decoded.sub !== "string") {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(
      decoded.sub,
    ).select("+refreshTokenHash");

    if (!user || !user.refreshTokenHash) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh session",
      });
    }

    const previousHash = user.refreshTokenHash;

    // Verify the complete refresh token.
    if (!verifyRefreshToken(token, previousHash)) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh session expired",
      });
    }

    const tokens = createTokens(user.id);

    const newRefreshTokenHash = hashRefreshToken(
      tokens.refreshToken,
    );

    // Atomic compare-and-swap.
    // Only one concurrent request can rotate this token.
    const rotationResult = await User.updateOne(
      {
        _id: user._id,
        refreshTokenHash: previousHash,
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
        message: "Refresh session has already been used",
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

    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
      });
    }

    console.error("Refresh error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not refresh session",
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
    if (req.userId) {
      await User.updateOne(
        {
          _id: req.userId,
        },
        {
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