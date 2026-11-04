const API_URL = "/api/v1";

interface ApiOptions {
  method?: string;
  body?: unknown;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      method: options.method || "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: options.body
        ? JSON.stringify(options.body)
        : undefined
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong"
    );
  }

  return data as T;
}