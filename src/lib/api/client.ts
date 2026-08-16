/**
 * Cliente HTTP minimalista para consumir Django REST Framework.
 *
 * Inyecta el access token de localStorage y renueva automáticamente el token
 * ante el primer 401 (refresh una vez y reintenta la misma petición).
 */

import { refreshTokens } from "@/lib/auth/refresh";
import { tokenStore } from "@/lib/auth/token-store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean;
type Query = Record<string, QueryValue | QueryValue[] | undefined>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) url.searchParams.append(key, String(item));
    }
  }
  return url.toString();
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const raw = await res.text().catch(() => undefined);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "string" && parsed) return parsed;
      if (parsed && typeof parsed === "object") {
        const value = (parsed as Record<string, unknown>).detail;
        if (typeof value === "string" && value) return value;
        if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
          return value[0];
        }
      }
    } catch {
      return raw.trim() || fallback;
    }
  }
  return fallback;
}

function headersFor(init: RequestInit): Record<string, string> {
  const extra: Record<string, string> = {};
  if (init.headers instanceof Headers) {
    init.headers.forEach((value, key) => {
      extra[key] = value;
    });
  } else if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) extra[key] = value;
  } else if (init.headers) {
    Object.assign(extra, init.headers);
  }

  const token = tokenStore.getAccess();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function doFetch(path: string, init: RequestInit, query?: Query) {
  const headers = headersFor(init);
  return fetch(buildUrl(path, query), { ...init, headers });
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  query?: Query,
): Promise<T> {
  const hadToken = Boolean(tokenStore.getAccess());
  let res: Response;
  try {
    res = await doFetch(path, init, query);
  } catch (error) {
    throw new ApiError(0, error instanceof Error ? error.message : "Error de red");
  }

  if (res.status === 401 && hadToken && (await refreshTokens())) {
    res = await doFetch(path, init, query);
  }

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res, res.statusText));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Petición multipart (FormData). No se setea Content-Type manualmente:
 * el navegador agrega el boundary correcto.
 */
async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const token = tokenStore.getAccess();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(buildUrl(path), {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401 && token && (await refreshTokens())) {
    headers.Authorization = `Bearer ${tokenStore.getAccess()}`;
    res = await fetch(buildUrl(path), { method: "POST", headers, body: formData });
  }

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res, res.statusText));
  }
  return (await res.json()) as T;
}

export const apiClient = {
  get<T>(path: string, query?: Query) {
    return request<T>(path, { method: "GET" }, query);
  },

  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },

  /** Sube un FormData con un archivo (multipart). */
  uploadForm<T>(path: string, formData: FormData) {
    return requestForm<T>(path, formData);
  },
};