import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ApiError } from "../services/api";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
} from "../features/auth/auth.service";

import { useAuthStore } from "./auth.store";

vi.mock("../features/auth/auth.service", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: vi.fn(),
  refreshSession: vi.fn(),
}));

const mockedLoginUser = vi.mocked(loginUser);
const mockedLogoutUser = vi.mocked(logoutUser);
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedRefreshSession = vi.mocked(refreshSession);

const validUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Test User",
  email: "test@example.com",
  preferredLanguage: "en",
};

const AUTH_CACHE_KEY = "mindvault_offline_user";

let storage: Map<string, string>;

const setOnlineStatus = (online: boolean): void => {
  vi.stubGlobal("navigator", {
    onLine: online,
  });
};

const saveTestUser = (): void => {
  storage.set(AUTH_CACHE_KEY, JSON.stringify(validUser));
};

beforeEach(() => {
  storage = new Map<string, string>();

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  });

  setOnlineStatus(true);

  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Authentication store", () => {
  it("stores the user after successful login", async () => {
    mockedLoginUser.mockResolvedValue(validUser);

    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "StrongPassword123",
    });

    const state = useAuthStore.getState();

    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(true);
  });

  it("does not authenticate when login fails", async () => {
    mockedLoginUser.mockRejectedValue(
      new ApiError("Invalid credentials.", 401)
    );

    await expect(
      useAuthStore.getState().login({
        email: "test@example.com",
        password: "WrongPassword123",
      })
    ).rejects.toThrow();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("restores the cached profile when offline", async () => {
    saveTestUser();
    setOnlineStatus(false);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(mockedGetCurrentUser).not.toHaveBeenCalled();
  });

  it("does not authenticate offline without a cached profile", async () => {
    setOnlineStatus(false);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("refreshes an expired access session", async () => {
    mockedGetCurrentUser
      .mockRejectedValueOnce(
        new ApiError("Unauthorized.", 401)
      )
      .mockResolvedValueOnce(validUser);

    mockedRefreshSession.mockResolvedValue(undefined);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(mockedRefreshSession).toHaveBeenCalledOnce();
    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2);
    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("clears the cached profile when refresh authentication fails", async () => {
    saveTestUser();

    mockedGetCurrentUser.mockRejectedValue(
      new ApiError("Unauthorized.", 401)
    );

    mockedRefreshSession.mockRejectedValue(
      new ApiError("Invalid refresh token.", 401)
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
  });

  it("preserves the cached profile during a server outage", async () => {
    saveTestUser();

    mockedGetCurrentUser.mockRejectedValue(
      new ApiError("Server unavailable.", 503)
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(true);
  });

  it("clears authentication locally when logging out offline", async () => {
    saveTestUser();
    setOnlineStatus(false);

    useAuthStore.setState({
      user: validUser,
      isAuthenticated: true,
      isLoading: false,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();

    expect(mockedLogoutUser).not.toHaveBeenCalled();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
  });

  it("clears local authentication even if server logout fails", async () => {
    saveTestUser();

    useAuthStore.setState({
      user: validUser,
      isAuthenticated: true,
      isLoading: false,
    });

    mockedLogoutUser.mockRejectedValue(
      new ApiError("Server unavailable.", 503)
    );

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
  });
});