const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

const API_URL = rawApiUrl?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(
  path,
  { method = "GET", body, accessToken, headers = {} } = {},
) {
  if (!API_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_URL environment variable.");
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Unable to contact the server.",
      details: error.message,
    });
  }

  const responseText = await response.text();

  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: responseData?.error?.code || "API_ERROR",
      message: responseData?.error?.message || "An unexpected error occurred.",
      details: responseData?.error?.details,
    });
  }

  return responseData;
}
