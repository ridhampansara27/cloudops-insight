import {
  ApiError,
  getApiErrorMessage,
} from "@/lib/api-error";

import {
  useAuthStore,
} from "@/stores/auth-store";


import {
  useWorkspaceStore,
} from "@/features/workspace/workspace-store";

import type {
  LoginResponse,
} from "@/types/auth";


const API_BASE_URL = (
  import.meta.env
    .VITE_API_BASE_URL ??
  ""
).replace(
  /\/$/,
  "",
);


interface ApiRequestOptions
  extends Omit<
    RequestInit,
    "body" | "credentials"
  > {
  json?: unknown;

  form?: URLSearchParams;

  requiresAuth?: boolean;
}


type NetworkRequestOptions =
  Omit<
    ApiRequestOptions,
    "requiresAuth"
  >;


let refreshPromise:
  | Promise<
      string | null
    >
  | null =
    null;


async function readResponseBody(
  response: Response,
): Promise<unknown> {
  if (
    response.status ===
    204
  ) {
    return null;
  }

  return response
    .json()
    .catch(
      () => null,
    );
}


function isLoginResponse(
  value: unknown,
): value is LoginResponse {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<LoginResponse>;

  return (
    typeof candidate.access_token ===
      "string" &&
    candidate.access_token.length >
      0 &&
    typeof candidate.token_type ===
      "string"
  );
}


async function performSessionRefresh():
Promise<
  string | null
> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        {
          method:
            "POST",

          // Required for the browser-managed HttpOnly refresh cookie.
          credentials:
            "include",

          headers: {
            Accept:
              "application/json",
          },
        },
      );

    const body =
      await readResponseBody(
        response,
      );

    if (
      !response.ok ||
      !isLoginResponse(
        body,
      )
    ) {
      useAuthStore
        .getState()
        .logout();

      return null;
    }

    useAuthStore
      .getState()
      .setAccessToken(
        body.access_token,
      );

    return body.access_token;

  } catch {
    useAuthStore
      .getState()
      .logout();

    return null;
  }
}


// Share one refresh request between every caller.
//
// This is security-critical with rotating refresh tokens: parallel 401
// handlers must not independently rotate the same cookie.
export function refreshAuthenticationSession():
Promise<
  string | null
> {
  if (
    refreshPromise ===
    null
  ) {
    refreshPromise =
      performSessionRefresh()
        .finally(
          () => {
            refreshPromise =
              null;
          },
        );
  }

  return refreshPromise;
}


async function sendRequest(
  path: string,
  options:
    NetworkRequestOptions,
  accessToken:
    | string
    | null,
): Promise<Response> {
  const {
    json,
    form,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders =
    new Headers(
      headers,
    );

  requestHeaders.set(
    "Accept",
    "application/json",
  );

  if (accessToken) {
    requestHeaders.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );

    const activeOrganizationId =
      useWorkspaceStore
        .getState()
        .activeOrganizationId;

    if (activeOrganizationId) {
      requestHeaders.set(
        "X-Organization-ID",
        activeOrganizationId,
      );
    }
  }

  let body:
    | string
    | URLSearchParams
    | undefined;

  if (
    json !== undefined
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );

    body = JSON.stringify(
      json,
    );
  }

  if (
    form !== undefined
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/x-www-form-urlencoded",
    );

    body = form;
  }

  return fetch(
    `${API_BASE_URL}${path}`,
    {
      ...requestOptions,

      // Login receives the cookie; refresh/logout send it.
      // The cookie itself remains inaccessible to JavaScript.
      credentials:
        "include",

      headers:
        requestHeaders,

      body,
    },
  );
}


function authenticationUnavailableError():
ApiError {
  return new ApiError(
    "Authentication session is unavailable.",
    401,
    null,
  );
}


export async function apiRequest<T>(
  path: string,
  options:
    ApiRequestOptions = {},
): Promise<T> {
  const {
    requiresAuth = true,
    ...networkOptions
  } = options;

  let accessToken =
    requiresAuth
      ? useAuthStore
          .getState()
          .accessToken
      : null;

  // A protected request may arrive before a page has restored its
  // in-memory access token. Restore it from the HttpOnly session once.
  if (
    requiresAuth &&
    !accessToken
  ) {
    accessToken =
      await refreshAuthenticationSession();

    if (!accessToken) {
      throw authenticationUnavailableError();
    }
  }

  let response =
    await sendRequest(
      path,
      networkOptions,
      accessToken,
    );

  // Access JWTs are intentionally short lived. Rotate the refresh bearer
  // once and retry this protected request exactly once.
  if (
    requiresAuth &&
    response.status ===
      401
  ) {
    const refreshedToken =
      await refreshAuthenticationSession();

    if (!refreshedToken) {
      throw authenticationUnavailableError();
    }

    response =
      await sendRequest(
        path,
        networkOptions,
        refreshedToken,
      );
  }

  const responseBody =
    await readResponseBody(
      response,
    );

  if (!response.ok) {
    if (
      requiresAuth &&
      response.status ===
        401
    ) {
      useAuthStore
        .getState()
        .logout();
    }

    throw new ApiError(
      getApiErrorMessage(
        responseBody,
      ),
      response.status,
      responseBody,
    );
  }

  if (
    response.status ===
    204
  ) {
    return undefined as T;
  }

  return responseBody as T;
}