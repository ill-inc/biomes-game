export const errorCodeToStatus = {
  not_found: 404,
  invalid_request: 400,
  unauthorized: 401,
  bad_param: 400,
  bad_method: 405,
  gone: 410,
  internal_error: 500,
  ecs_error: 501,
  blockchain_error: 502,
  killswitched: 503,
  overloaded: 503,
  lameduck: 503,
} as const;

export type APIErrorCode = keyof typeof errorCodeToStatus;

export class APIError extends Error {
  code: APIErrorCode;

  constructor(code: APIErrorCode, message?: string) {
    super(message);
    this.code = code;
  }

  status() {
    return errorCodeToStatus[this.code];
  }

  serialize() {
    return {
      error: this.code,
      message: this.message,
    };
  }
}

export async function throwPotentialAPIError(response: Response, json: any) {
  // Try to determine if this is a local API error
  // The response may also be in statusText
  let statusJson: any;
  try {
    statusJson = JSON.parse(response.statusText);
  } catch {}

  if (json && typeof json.error === "string") {
    const errorCode = json.error as APIErrorCode;
    if (errorCodeToStatus[errorCode] === response.status) {
      throw new APIError(errorCode, json.message);
    } else if (json.error === "internal_server_error") {
      throw new Error(
        `Internal Server Error${json.message ? `: ${json.message}` : ""}`
      );
    }
  }
  if (statusJson && typeof statusJson.error === "string") {
    const errorCode = statusJson.error as APIErrorCode;
    if (errorCodeToStatus[errorCode] === response.status) {
      throw new APIError(errorCode, statusJson.message);
    } else if (json.error === "internal_server_error") {
      if (json.message !== "Internal Server Error:") {
        throw new Error(
          `Internal Server Error${json.message ? `: ${json.message}` : ""}`
        );
      }
    }
  }
}

export function isAPIErrorCode(code: APIErrorCode, error: any) {
  return error instanceof APIError && error.code === code;
}

export function isApiErrorCode(code: any): code is APIErrorCode {
  return (
    typeof code === "string" &&
    errorCodeToStatus[code as APIErrorCode] !== undefined
  );
}
