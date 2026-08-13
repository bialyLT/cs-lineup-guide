import type { ID, User } from "@/types";
import { apiClient } from "./client";

interface AuthResponse {
  user: User;
  refresh: string;
  access: string;
}

/** Servicios de usuario y autenticación. */
export const userService = {
  me: () => apiClient.get<{ user: User }>("/me/"),

  getUser: (id: ID) => apiClient.get<User>(`/users/${id}/`),

  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>("/auth/login/", { email, password }),

  loginWithGoogle: (credential: string) =>
    apiClient.post<AuthResponse>("/auth/google/", { credential }),

  register: (body: { username: string; email: string; password: string }) =>
    apiClient.post<AuthResponse>("/auth/register/", body),
};