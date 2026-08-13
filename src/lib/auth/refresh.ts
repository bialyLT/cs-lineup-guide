import { tokenStore } from "./token-store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/**
 * Intercambia el refresh token por un par nuevo. Devuelve true si se pudo
 * renovar, false si el refresh expiró o no hay token.
 */
export async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    return false;
  }

  if (!res.ok) {
    tokenStore.clear();
    return false;
  }

  const data = (await res.json().catch(() => null)) as
    | { access: string; refresh?: string }
    | null;
  if (!data?.access) {
    tokenStore.clear();
    return false;
  }

  tokenStore.setTokens(data.access, data.refresh ?? refresh);
  return true;
}