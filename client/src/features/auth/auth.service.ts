import { apiRequest } from "../../services/api";

import type {
  AuthResponse,
  AuthUser,
  RegisterData,
  LoginData
} from "./auth.types";

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

  return response.user;
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

  return response.user;
};

// GET CURRENT USER
export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await apiRequest<{
    success: boolean;
    user: AuthUser;
  }>("/auth/me");

  return response.user;
};

// REFRESH SESSION
export const refreshSession = async (): Promise<void> => {
  await apiRequest("/auth/refresh", {
    method: "POST"
  });
};

// LOGOUT
export const logoutUser = async (): Promise<void> => {
  await apiRequest("/auth/logout", {
    method: "POST"
  });
};