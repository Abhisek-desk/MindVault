const API_URL = "/api/v1";

const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const;

type ApiMethod = (typeof ALLOWED_METHODS)[number];

interface ApiOptions {
  method?: ApiMethod;
  body?: unknown;
  timeoutMs?: number;
}

interface ApiErrorResponse {
  message?: unknown;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException &&
  error.name === "AbortError";

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  // VALIDATE API ENDPOINT
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//") ||
    endpoint.includes("\\")
  ) {
    throw new ApiError("Invalid API endpoint.", 0);
  }

  // VALIDATE HTTP METHOD
  const method = options.method ?? "GET";

  if (!ALLOWED_METHODS.includes(method)) {
    throw new ApiError("Unsupported HTTP method.", 0);
  }

  // PREVENT GET REQUEST BODIES
  if (method === "GET" && options.body !== undefined) {
    throw new ApiError(
      "GET requests cannot contain a request body.",
      0,
    );
  }

  // VALIDATE TIMEOUT
  const timeoutMs = options.timeoutMs ?? 15000;

  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 60000
  ) {
    throw new ApiError("Invalid request timeout.", 0);
  }

  // SERIALIZE REQUEST BODY SAFELY
  let requestBody: string | undefined;

  if (options.body !== undefined) {
    try {
      requestBody = JSON.stringify(options.body);
    } catch {
      throw new ApiError("Invalid request body.", 0);
    }

    if (requestBody === undefined) {
      throw new ApiError("Invalid request body.", 0);
    }
  }

  const controller = new AbortController();

  const timeout = window.setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    // SEND REQUEST
    let response: Response;

    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        method,
        credentials: "include",
        redirect: "error",
        headers: {
          Accept: "application/json",
          ...(requestBody !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body: requestBody,
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new ApiError(
          "The request timed out. Please try again.",
          0,
        );
      }

      throw new ApiError(
        "Unable to connect to the server. Check your internet connection.",
        0,
      );
    }

    // HANDLE EMPTY RESPONSES
    if (response.status === 204) {
      return undefined as T;
    }

    // VALIDATE RESPONSE CONTENT TYPE
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    const isJsonResponse =
      contentType === "application/json" ||
      contentType?.endsWith("+json") === true;

    if (!isJsonResponse) {
      if (!response.ok) {
        throw new ApiError(
          "Something went wrong.",
          response.status,
        );
      }

      throw new ApiError(
        "The server returned an invalid response.",
        response.status,
      );
    }

    // PARSE RESPONSE
    let data: unknown;

    try {
      data = await response.json();
    } catch (error) {
      if (isAbortError(error)) {
        throw new ApiError(
          "The request timed out. Please try again.",
          0,
        );
      }

      if (response.ok) {
        throw new ApiError(
          "The server returned an invalid response.",
          response.status,
        );
      }

      data = null;
    }

    // HANDLE HTTP ERRORS
    if (!response.ok) {
      let message = "Something went wrong.";

      if (
        typeof data === "object" &&
        data !== null &&
        "message" in data
      ) {
        const errorData = data as ApiErrorResponse;

        if (
          typeof errorData.message === "string" &&
          errorData.message.length > 0 &&
          errorData.message.length <= 300
        ) {
          message = errorData.message;
        }
      }

      throw new ApiError(message, response.status);
    }

    return data as T;
  } finally {
    // KEEP TIMEOUT ACTIVE UNTIL RESPONSE PROCESSING FINISHES
    window.clearTimeout(timeout);
  }
}
