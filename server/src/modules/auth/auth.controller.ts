import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { User } from "../users/user.model";
import {
  registerSchema,
  loginSchema
} from "./auth.validation";

// GET ACCESS SECRET
const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not loaded");
  }

  return secret;
};

// GET REFRESH SECRET
const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not loaded");
  }

  return secret;
};

// COOKIE OPTIONS
const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1"
};

const refreshCookieOptions = {
  ...accessCookieOptions,
  path: "/api/v1/auth/refresh"
};

// CREATE TOKENS
const createTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { sub: userId },
    getAccessSecret(),
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { sub: userId },
    getRefreshSecret(),
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

// SET AUTH COOKIES
const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie("accessToken", accessToken, {
    ...accessCookieOptions,
    maxAge: 15 * 60 * 1000
  });

  res.cookie("refreshToken", refreshToken, {
    ...refreshCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// CLEAR AUTH COOKIES
const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", accessCookieOptions);
  res.clearCookie("refreshToken", refreshCookieOptions);
};

// ========================================
// REGISTER
// ========================================

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration details"
      });
    }

    const { name, email, password } = result.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash
    });

    const tokens = createTokens(user.id);

    user.refreshTokenHash = await bcrypt.hash(
      tokens.refreshToken,
      12
    );

    await user.save();

    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage
      }
    });

  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};

// ========================================
// LOGIN
// ========================================

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login details"
      });
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email })
      .select("+passwordHash +refreshTokenHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const tokens = createTokens(user.id);

    user.refreshTokenHash = await bcrypt.hash(
      tokens.refreshToken,
      12
    );

    await user.save();

    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken
    );

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};

// ========================================
// REFRESH ACCESS TOKEN
// ========================================

export const refresh = async (
  req: Request,
  res: Response
) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token missing"
      });
    }

    // FIXED: Use getRefreshSecret()
    const decoded = jwt.verify(
      token,
      getRefreshSecret()
    ) as jwt.JwtPayload;

    if (!decoded.sub) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }

    const user = await User.findById(decoded.sub)
      .select("+refreshTokenHash");

    if (!user || !user.refreshTokenHash) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh session"
      });
    }

    const validToken = await bcrypt.compare(
      token,
      user.refreshTokenHash
    );

    if (!validToken) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh session expired"
      });
    }

    const tokens = createTokens(user.id);

    user.refreshTokenHash = await bcrypt.hash(
      tokens.refreshToken,
      12
    );

    await user.save();

    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken
    );

    return res.json({
      success: true,
      message: "Session refreshed"
    });

  } catch (error) {
    clearAuthCookies(res);

    return res.status(401).json({
      success: false,
      message: "Session expired"
    });
  }
};

// ========================================
// GET CURRENT USER
// ========================================

export const getMe = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not load user"
    });
  }
};

// ========================================
// LOGOUT
// ========================================

export const logout = async (
  req: Request,
  res: Response
) => {
  try {
    if (req.userId) {
      await User.updateOne(
        { _id: req.userId },
        { $unset: { refreshTokenHash: 1 } }
      );
    }

    clearAuthCookies(res);

    return res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    clearAuthCookies(res);

    return res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
};