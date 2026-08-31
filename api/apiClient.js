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

function isFormDataBody(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export async function apiRequest(
  path,
  { method = "GET", body, accessToken, headers = {}, signal } = {},
) {
  if (!API_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_URL environment variable.");
  }

  const hasBody = body !== undefined && body !== null;
  const isFormData = hasBody && isFormDataBody(body);

  let requestBody;

  if (!hasBody) {
    requestBody = undefined;
  } else if (isFormData) {
    /*
     * React Native must generate the multipart boundary itself.
     * Do not manually set Content-Type for FormData requests.
     */
    requestBody = body;
  } else {
    requestBody = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,

      headers: {
        Accept: "application/json",

        /*
         * JSON requests require an explicit content type.
         * Multipart requests receive their content type and boundary
         * automatically from React Native.
         */
        ...(hasBody && !isFormData
          ? {
              "Content-Type": "application/json",
            }
          : {}),

        ...(accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {}),

        ...headers,
      },

      body: requestBody,
      signal,
    });
  } catch (error) {
    throw new ApiError({
      status: 0,

      code: error.name === "AbortError" ? "REQUEST_ABORTED" : "NETWORK_ERROR",

      message:
        error.name === "AbortError"
          ? "The request was cancelled."
          : "Unable to contact the server.",

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
