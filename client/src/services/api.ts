const API_URL = "/api/v1";

interface ApiOptions {
  method?: string;
  body?: unknown;
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
          : undefined
    });
  } catch {
    throw new ApiError(
      "Unable to connect to the server. Check your internet connection.",
      0
    );
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
      data.message || "Something went wrong.",
      response.status
    );
  }

  return data as T;
}