"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, adminService } from "@/lib/api/admin.service";
import { getAdminResource } from "@/lib/admin/resources";
import {
  AdminForm,
  type AdminOptionList,
  type AdminPendingFile,
} from "@/features/admin/admin-form";
import { useRelationOptions } from "@/features/admin/use-relation-options";

interface AdminMutationInput {
  payload: Record<string, unknown>;
  files: AdminPendingFile[];
  optionLists: Record<string, AdminOptionList>;
}

/** Aplica el diff de opciones (options-editor) contra la pregunta guardada. */
async function syncOptions(
  resourceKey: string,
  ownerId: string | number,
  optionLists: Record<string, AdminOptionList>,
) {
  const resource = getAdminResource(resourceKey);
  if (!resource) return;
  for (const [fieldName, { originals, drafts }] of Object.entries(optionLists)) {
    const field = resource.fields.find((f) => f.name === fieldName);
    const config = field?.optionsEditor;
    if (!config) continue;

    const originalIds = new Set(
      originals.filter((option) => option.id != null).map((option) => String(option.id)),
    );
    const draftIds = new Set(
      drafts.filter((option) => option.id != null).map((option) => String(option.id)),
    );
    for (const id of originalIds) {
      if (!draftIds.has(id)) {
        await adminService.remove(config.relatedResource, id);
      }
    }
    for (const draft of drafts) {
      const body = {
        [config.relationField]: ownerId,
        text: draft.text,
        is_correct: draft.is_correct,
        order: draft.order === "" ? 0 : Number(draft.order) || 0,
        [config.positionOutput.x]:
          draft.x === "" || Number.isNaN(Number(draft.x)) ? null : Number(draft.x),
        [config.positionOutput.y]:
          draft.y === "" || Number.isNaN(Number(draft.y)) ? null : Number(draft.y),
      };
      if (draft.id != null) {
        await adminService.update(config.relatedResource, draft.id, body);
      } else {
        await adminService.create(config.relatedResource, body);
      }
    }
  }
}

function AdminResourceEditPageContent() {
  const params = useParams<{ resource: string; id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const resource = getAdminResource(params.resource);
  const isNew = params.id === "new";

  const fixedValues = useMemo(() => {
    const fixed: Record<string, string> = {};
    if (!resource?.filters) return fixed;
    for (const filter of resource.filters) {
      if (!resource.fields.some((field) => field.name === filter.name)) continue;
      const value = searchParams.get(filter.name);
      if (value) fixed[filter.name] = value;
    }
    return fixed;
  }, [resource, searchParams]);

  const filtersQuery = useMemo(() => {
    const entries: Array<[string, string]> = [];
    if (resource?.filters) {
      for (const filter of resource.filters) {
        const value = searchParams.get(filter.name);
        if (value) entries.push([filter.name, value]);
      }
    }
    if (entries.length === 0) return "";
    return `?${entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&")}`;
  }, [resource, searchParams]);

  const { data: record, isLoading } = useQuery({
    queryKey: ["admin-detail", resource?.key, isNew ? undefined : params.id],
    queryFn: () => adminService.retrieve(resource!.key, params.id),
    enabled: Boolean(resource) && !isNew,
  });

  const relationOptionsQuery = useRelationOptions(resource!);

  const mutation = useMutation({
    mutationFn: async ({ payload, files, optionLists }: AdminMutationInput) => {
      let finalPayload = payload;
      const uploaded: string[] = [];
      try {
        for (const pending of files) {
          const result = await adminService.upload(
            pending.file,
            pending.uploadTo === "questions" ? "questions" : "maps",
          );
          uploaded.push(result.url);
          finalPayload = { ...finalPayload, [pending.name]: result.url };
        }
        const saved = isNew
          ? await adminService.create(resource!.key, finalPayload)
          : await adminService.update(resource!.key, params.id, finalPayload);
        await syncOptions(resource!.key, saved.id, optionLists);
        return saved;
      } catch (error) {
        uploaded.forEach((url) => {
          adminService.deleteImage(url).catch(() => undefined);
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-list", resource?.key] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-options"] });
      if (resource?.fields.some((field) => field.type === "options-editor")) {
        queryClient.invalidateQueries({ queryKey: ["admin-list", "options"] });
      }

      const oldUrl =
        typeof record?.image_url === "string" ? record.image_url : undefined;
      const newUrl =
        typeof data?.image_url === "string" ? data.image_url : undefined;
      if (!isNew && oldUrl && oldUrl !== newUrl) {
        adminService.deleteImage(oldUrl).catch(() => undefined);
      }

      router.push(`/admin/${resource!.key}${filtersQuery}`);
    },
  });

  if (!resource) {
    return (
      <p className="text-sm text-muted-foreground">
        Recurso de administración desconocido.
      </p>
    );
  }

  if (resource.readOnly && !isNew) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href={`/admin/${resource.key}`}>
            <ArrowLeft />
            Volver
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Este recurso es de solo lectura.
        </p>
      </div>
    );
  }

  if (isNew ? relationOptionsQuery.isLoading : isLoading || relationOptionsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const errorMessage = mutation.isError
    ? (mutation.error as ApiError).message
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href={`/admin/${resource.key}${filtersQuery}`}>
          <ArrowLeft />
          {resource.label}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {isNew
              ? `Nuevo ${resource.singular.toLowerCase()}`
              : `Editar ${resource.singular.toLowerCase()} #${params.id}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminForm
            resource={resource}
            initialValues={record}
            relationOptions={relationOptionsQuery.data ?? {}}
            fixedValues={fixedValues}
            submitLabel={isNew ? "Crear" : "Guardar cambios"}
            busy={mutation.isPending}
            error={errorMessage}
            onSubmit={(payload, files, optionLists) =>
              mutation.mutate({ payload, files, optionLists })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminResourceEditPage() {
  return (
    <Suspense fallback={null}>
      <AdminResourceEditPageContent />
    </Suspense>
  );
}