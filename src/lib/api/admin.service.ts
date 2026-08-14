import { apiClient } from "./client";

export { ApiError } from "./client";

export interface AdminStats {
  counts: Record<string, number>;
  recent_activity: Array<{
    id: number | string;
    actor: number | null;
    actor_name?: string;
    action: string;
    action_display: string;
    app_label: string;
    model_name: string;
    object_id: string;
    summary: string;
    ip_address?: string | null;
    created_at: string;
  }>;
}

export interface AdminAuditEntry {
  id: number | string;
  actor: number | null;
  actor_name?: string;
  action: string;
  action_display: string;
  app_label: string;
  model_name: string;
  object_id: string;
  summary: string;
  ip_address?: string | null;
  created_at: string;
}

export type AdminRecord = Record<string, unknown> & { id: number | string };

export type AdminListQuery = Record<string, string | number | boolean | undefined>;

export const adminService = {
  list<T = AdminRecord>(resource: string, query?: AdminListQuery): Promise<T[]> {
    return apiClient.get<T[]>(`/admin/${resource}/`, query);
  },

  retrieve<T = AdminRecord>(resource: string, id: string | number): Promise<T> {
    return apiClient.get<T>(`/admin/${resource}/${id}/`);
  },

  create<T = AdminRecord>(resource: string, body: unknown): Promise<T> {
    return apiClient.post<T>(`/admin/${resource}/`, body);
  },

  update<T = AdminRecord>(
    resource: string,
    id: string | number,
    body: unknown,
  ): Promise<T> {
    return apiClient.patch<T>(`/admin/${resource}/${id}/`, body);
  },

  remove(resource: string, id: string | number): Promise<void> {
    return apiClient.delete<void>(`/admin/${resource}/${id}/`);
  },

  /** Sube una imagen al bucket R2 y devuelve la URL pública. */
  async upload(
    file: File,
    kind: "maps" | "questions",
  ): Promise<{ url: string; kind: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    return apiClient.uploadForm<{ url: string; kind: string }>(
      "/admin/uploads/",
      formData,
    );
  },

  /** Elimina un objeto del bucket R2 (best-effort). */
  async deleteImage(url: string): Promise<{ deleted: boolean }> {
    return apiClient.delete<{ deleted: boolean }>(
      `/admin/uploads/?url=${encodeURIComponent(url)}`,
    );
  },

  stats(): Promise<AdminStats> {
    return apiClient.get<AdminStats>("/admin/stats/");
  },
};
