const API_URL = "/api/v1";

interface ApiOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//") ||
    endpoint.includes("\\")
  ) {
    throw new ApiError("Invalid API endpoint.", 0);
  }

  const timeoutMs = options.timeoutMs ?? 15000;

  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 60000
  ) {
    throw new ApiError("Invalid request timeout.", 0);
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: options.method || "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body:
        options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "The request timed out. Please try again.",
        0
      );
    }

    throw new ApiError(
      "Unable to connect to the server. Check your internet connection.",
      0
    );
  } finally {
    clearTimeout(timeout);
  }

  let data: any;

  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "The server returned an invalid response.",
      response.status
    );
  }

  if (!response.ok) {
    throw new ApiError(
      typeof data?.message === "string"
        ? data.message
        : "Something went wrong.",
      response.status
    );
  }

  return data as T;
}