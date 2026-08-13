"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { apiClient } from "@/lib/api/client";
import { mapApiUser, type ApiUser } from "@/lib/api/mappers";
import type { User } from "@/types";

import { tokenStore } from "./token-store";

interface AuthResponse {
  user: ApiUser;
  refresh: string;
  access: string;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (body: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!tokenStore.getAccess()) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const data = await apiClient.get<{ user: ApiUser }>("/me/");
        if (cancelled) return;
        setUser(mapApiUser(data.user));
        setStatus("authenticated");
      } catch {
        tokenStore.clear();
        if (cancelled) return;
        setStatus("unauthenticated");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const storeSession = useCallback((data: AuthResponse) => {
    tokenStore.setTokens(data.access, data.refresh);
    setUser(mapApiUser(data.user));
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiClient.post<AuthResponse>("/auth/login/", {
        email,
        password,
      });
      storeSession(data);
    },
    [storeSession],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const data = await apiClient.post<AuthResponse>("/auth/google/", {
        credential,
      });
      storeSession(data);
    },
    [storeSession],
  );

  const register = useCallback(
    async (body: { username: string; email: string; password: string }) => {
      const data = await apiClient.post<AuthResponse>("/auth/register/", body);
      storeSession(data);
    },
    [storeSession],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, status, login, loginWithGoogle, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}