import { apiRequest, ApiError } from "../../services/api";

import type {
  AuthResponse,
  AuthUser,
  RegisterData,
  LoginData
} from "./auth.types";

interface CurrentUserResponse {
  success: boolean;
  user: AuthUser;
}

// Validate authentication user data received from the server.
const validateAuthUser = (value: unknown): AuthUser => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    !("name" in value) ||
    !("email" in value) ||
    !("preferredLanguage" in value)
  ) {
    throw new ApiError("Invalid authentication response.", 502);
  }

  const user = value as Record<string, unknown>;

  if (
    typeof user.id !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(user.id) ||
    typeof user.name !== "string" ||
    user.name.length < 2 ||
    user.name.length > 80 ||
    typeof user.email !== "string" ||
    user.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) ||
    typeof user.preferredLanguage !== "string" ||
    user.preferredLanguage.length < 2 ||
    user.preferredLanguage.length > 20
  ) {
    throw new ApiError("Invalid authentication response.", 502);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage
  };
};

// Validate registration and login responses.
const validateAuthResponse = (value: AuthResponse): AuthUser => {
  if (
    typeof value !== "object" ||
    value === null ||
    value.success !== true
  ) {
    throw new ApiError("Invalid authentication response.", 502);
  }

  return validateAuthUser(value.user);
};

// REGISTER
export const registerUser = async (
  data: RegisterData
): Promise<AuthUser> => {
  const response = await apiRequest<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: data
    }
  );

  return validateAuthResponse(response);
};

// LOGIN
export const loginUser = async (
  data: LoginData
): Promise<AuthUser> => {
  const response = await apiRequest<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: data
    }
  );

  return validateAuthResponse(response);
};

// GET CURRENT USER
export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await apiRequest<CurrentUserResponse>("/auth/me");

  if (
    typeof response !== "object" ||
    response === null ||
    response.success !== true
  ) {
    throw new ApiError("Invalid authentication response.", 502);
  }

  return validateAuthUser(response.user);
};

// REFRESH SESSION
export const refreshSession = async (): Promise<void> => {
  const response = await apiRequest<{ success: boolean }>(
    "/auth/refresh",
    {
      method: "POST"
    }
  );

  if (response.success !== true) {
    throw new ApiError("Session refresh failed.", 502);
  }
};

// LOGOUT
export const logoutUser = async (): Promise<void> => {
  const response = await apiRequest<{ success: boolean }>(
    "/auth/logout",
    {
      method: "POST"
    }
  );

  if (response.success !== true) {
    throw new ApiError("Logout failed.", 502);
  }
};