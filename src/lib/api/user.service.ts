import type { User, ID } from "@/types";
import { apiClient } from "./client";

/** Servicios de usuario (autenticación real se implementará luego). */
export const userService = {
  me: () => apiClient.get<User>("/me/"),

  getUser: (id: ID) => apiClient.get<User>(`/users/${id}/`),

  login: (email: string, password: string) =>
    apiClient.post<{ access: string; refresh: string }>("/auth/login/", {
      email,
      password,
    }),

  register: (body: { username: string; email: string; password: string }) =>
    apiClient.post<User>("/auth/register/", body),
};