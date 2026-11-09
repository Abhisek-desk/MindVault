import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest, ApiError } from "../../services/api";

import {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshSession,
  logoutUser,
} from "./auth.service";

vi.mock("../../services/api", () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

const mockedApiRequest = vi.mocked(apiRequest);

const validUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Test User",
  email: "test@example.com",
  preferredLanguage: "en",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Authentication service", () => {
  it("accepts a valid registration response", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      message: "Registered",
      user: validUser,
    } as never);

    const result = await registerUser({
      name: "Test User",
      email: "test@example.com",
      password: "StrongPassword123",
    });

    expect(result).toEqual(validUser);
  });

  it("accepts a valid login response", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      message: "Logged in",
      user: validUser,
    } as never);

    const result = await loginUser({
      email: "test@example.com",
      password: "StrongPassword123",
    });

    expect(result).toEqual(validUser);
  });

  it("rejects an invalid user ID", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      message: "Logged in",
      user: {
        ...validUser,
        id: "invalid-id",
      },
    } as never);

    await expect(
      loginUser({
        email: "test@example.com",
        password: "StrongPassword123",
      })
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
    });
  });

  it("rejects an invalid email address", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      user: {
        ...validUser,
        email: "invalid-email",
      },
    } as never);

    await expect(getCurrentUser()).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a response with missing user data", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
      message: "Logged in",
    } as never);

    await expect(
      loginUser({
        email: "test@example.com",
        password: "StrongPassword123",
      })
    ).rejects.toMatchObject({
      status: 502,
    });
  });

  it("rejects an unsuccessful refresh response", async () => {
    mockedApiRequest.mockResolvedValue({
      success: false,
    } as never);

    await expect(refreshSession()).rejects.toMatchObject({
      status: 502,
    });
  });

  it("accepts a successful refresh response", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
    } as never);

    await expect(refreshSession()).resolves.toBeUndefined();
  });

  it("rejects an unsuccessful logout response", async () => {
    mockedApiRequest.mockResolvedValue({
      success: false,
    } as never);

    await expect(logoutUser()).rejects.toMatchObject({
      status: 502,
    });
  });

  it("accepts a successful logout response", async () => {
    mockedApiRequest.mockResolvedValue({
      success: true,
    } as never);

    await expect(logoutUser()).resolves.toBeUndefined();
  });
});