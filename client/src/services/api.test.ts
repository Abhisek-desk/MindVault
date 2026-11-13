import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ApiError, apiRequest } from "./api";

describe("API service security", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });

    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects invalid API endpoints", async () => {
    await expect(
      apiRequest("//evil.com")
    ).rejects.toThrow("Invalid API endpoint.");

    await expect(
      apiRequest("https://evil.com")
    ).rejects.toThrow("Invalid API endpoint.");

    await expect(
      apiRequest("/api\\evil")
    ).rejects.toThrow("Invalid API endpoint.");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects unsupported HTTP methods", async () => {
  await expect(
    apiRequest("/notes", {
      method: "OPTIONS" as never,
    })
  ).rejects.toThrow("Unsupported HTTP method.");

  expect(fetch).not.toHaveBeenCalled();
});

it("supports secure PUT requests with JSON bodies", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        message: "Progress updated.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  );

  const result = await apiRequest<{
    success: boolean;
    message: string;
  }>("/learning/507f1f77bcf86cd799439011", {
    method: "PUT",
    body: {
      completedTopics: ["lesson-1.md"],
      totalTopics: 5,
    },
  });

  expect(result.success).toBe(true);

  expect(fetch).toHaveBeenCalledWith(
    "/api/v1/learning/507f1f77bcf86cd799439011",
    expect.objectContaining({
      method: "PUT",
      credentials: "include",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completedTopics: ["lesson-1.md"],
        totalTopics: 5,
      }),
    })
  );
});

  it("rejects GET requests containing a body", async () => {
    await expect(
      apiRequest("/notes", {
        body: { title: "Test" },
      })
    ).rejects.toThrow(
      "GET requests cannot contain a request body."
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects invalid timeout values", async () => {
    await expect(
      apiRequest("/notes", {
        timeoutMs: 500,
      })
    ).rejects.toThrow("Invalid request timeout.");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects circular request bodies", async () => {
    const body: Record<string, unknown> = {};
    body.self = body;

    await expect(
      apiRequest("/notes", {
        method: "POST",
        body,
      })
    ).rejects.toThrow("Invalid request body.");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends requests with secure fetch options", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await apiRequest("/notes");

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/notes",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        redirect: "error",
        headers: {
          Accept: "application/json",
        },
      })
    );
  });

  it("accepts valid JSON responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Success",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const result = await apiRequest<{
      success: boolean;
      message: string;
    }>("/notes");

    expect(result.success).toBe(true);
    expect(result.message).toBe("Success");
  });

  it("accepts JSON responses with charset parameters", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      )
    );

    const result = await apiRequest<{ success: boolean }>(
      "/notes"
    );

    expect(result.success).toBe(true);
  });

  it("rejects HTML responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>Error</html>", {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      })
    );

    await expect(
      apiRequest("/notes")
    ).rejects.toThrow(
      "The server returned an invalid response."
    );
  });

  it("rejects unsuccessful responses with generic errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>Error</html>", {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      })
    );

    try {
      await apiRequest("/notes");
      throw new Error("Expected request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(500);
      expect((error as Error).message).toBe(
        "Something went wrong."
      );
    }
  });

  it("preserves valid server error messages", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Invalid credentials.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(
      apiRequest("/auth/login")
    ).rejects.toThrow("Invalid credentials.");
  });

  it("does not expose excessively long server messages", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "A".repeat(301),
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(
      apiRequest("/notes")
    ).rejects.toThrow("Something went wrong.");
  });

  it("handles empty 204 responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 204,
      })
    );

    const result = await apiRequest<void>(
      "/auth/logout",
      {
        method: "POST",
      }
    );

    expect(result).toBeUndefined();
  });

  it("handles network failures safely", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new TypeError("Internal network details")
    );

    await expect(
      apiRequest("/notes")
    ).rejects.toThrow(
      "Unable to connect to the server. Check your internet connection."
    );
  });
});