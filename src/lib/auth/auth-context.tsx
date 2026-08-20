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
import { userService } from "@/lib/api/user.service";
import type { User } from "@/types";

import { tokenStore } from "./token-store";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthResponseRaw {
  user: ApiUser;
  refresh: string;
  access: string;
}

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (emailOrUsername: string, password: string) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  /** Crea la cuenta con usuario y contraseña. Devuelve el usuario (sin verificar). */
  register: (body: { username: string; password: string }) => Promise<User>;
  /** Adjunta el email a la cuenta y envía el código. Devuelve el dev_code. */
  attachEmail: (email: string) => Promise<{ devCode: string | null }>;
  /** Valida el código y recién acá habilita el acceso. */
  verifyEmail: (code: string) => Promise<void>;
  /** Reenvía el código de verificación. Devuelve el dev_code. */
  resendVerification: () => Promise<{ devCode: string | null }>;
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

  const storeSession = useCallback((data: AuthResponseRaw) => {
    tokenStore.setTokens(data.access, data.refresh);
    setUser(mapApiUser(data.user));
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (emailOrUsername: string, password: string) => {
      const data = await apiClient.post<AuthResponseRaw>("/auth/login/", {
        email: emailOrUsername,
        password,
      });
      storeSession(data);
      return mapApiUser(data.user);
    },
    [storeSession],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const data = await apiClient.post<AuthResponseRaw>("/auth/google/", {
        credential,
      });
      storeSession(data);
      return mapApiUser(data.user);
    },
    [storeSession],
  );

  const register = useCallback(
    async (body: { username: string; password: string }) => {
      const data = await userService.register(body);
      storeSession(data);
      return mapApiUser(data.user);
    },
    [storeSession],
  );

  const attachEmail = useCallback(
    async (email: string) => {
      const data = await userService.attachEmail(email);
      return { devCode: data.dev_code };
    },
    [],
  );

  const verifyEmail = useCallback(
    async (code: string) => {
      const data = await userService.verifyEmail(code);
      storeSession(data);
    },
    [storeSession],
  );

  const resendVerification = useCallback(
    async () => {
      const data = await userService.resendVerification();
      return { devCode: data.dev_code };
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        loginWithGoogle,
        register,
        attachEmail,
        verifyEmail,
        resendVerification,
        logout,
      }}
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