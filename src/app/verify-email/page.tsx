"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Crosshair } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";

const PENDING_KEY = "ll.pendingVerify";

function readPending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { email?: string; code?: string };
  } catch {
    return null;
  }
}

function savePending(email: string, code: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, code }));
  } catch {
    // sessionStorage no disponible: se ignora.
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // noop
  }
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, attachEmail, verifyEmail, resendVerification, logout } =
    useAuth();

  // El botón "Verificar mi email" del correo llega con ?email=...&code=...
  const paramEmail = searchParams.get("email") ?? "";
  const paramCode = searchParams.get("code") ?? "";

  const [editingEmail, setEditingEmail] = useState(false);
  const [attachedEmail, setAttachedEmail] = useState<string | null>(null);
  const [email, setEmail] = useState(paramEmail);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittedRef = useRef(false);

  const verify = useCallback(
    async (targetCode: string) => {
      setError("");
      setSubmitting(true);
      try {
        await verifyEmail(targetCode.trim());
        toast.success("¡Email verificado! Bienvenido/a.");
        router.replace("/home");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo verificar el email.");
      } finally {
        setSubmitting(false);
      }
    },
    [verifyEmail, router],
  );

  // Guardar el código que llegó por el link del correo antes de cualquier
  // redirección, para poder recuperarlo tras iniciar sesión.
  useEffect(() => {
    if (paramCode && paramEmail) savePending(paramEmail, paramCode);
  }, [paramCode, paramEmail]);

  // Usuario sin sesión → login (el código pendiente queda en sessionStorage).
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Ya verificado → a la app.
  useEffect(() => {
    if (status === "authenticated" && user?.isEmailVerified) {
      router.replace("/home");
    }
  }, [status, user?.isEmailVerified, router]);

  // Si hay un código (del link o pendiente), se valida automáticamente.
  useEffect(() => {
    if (status !== "authenticated" || autoSubmittedRef.current) return;
    const pending = readPending();
    const targetCode = paramCode || pending?.code;
    if (!targetCode) return;
    autoSubmittedRef.current = true;
    clearPending();
    setTimeout(() => void verify(targetCode), 0);
  }, [status, paramCode, verify]);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { devCode: returnedCode } = await attachEmail(email.trim());
      setAttachedEmail(email.trim());
      setCode(returnedCode ?? "");
      setDevCode(returnedCode);
      setEditingEmail(false);
      toast.success("Enviamos un código de verificación a tu email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    await verify(code);
  }

  async function handleResend() {
    setError("");
    setSubmitting(true);
    try {
      const { devCode: returnedCode } = await resendVerification();
      setCode(returnedCode ?? "");
      setDevCode(returnedCode);
      toast.success("Enviamos un código nuevo a tu email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar el código.");
    } finally {
      setSubmitting(false);
    }
  }

  const knownEmail = user?.email || attachedEmail;
  const showEmailForm = editingEmail || !knownEmail;

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="text-sm text-muted-foreground">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Crosshair className="size-5" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-semibold tracking-tight">LineupLab</span>
      </div>
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Verificá tu email</CardTitle>
            <CardDescription>
              {showEmailForm
                ? "Ingresá un correo para recibir tu código de verificación y activar la cuenta."
                : "Ingresá el código que te enviamos por correo para activar tu cuenta."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {showEmailForm ? (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="verify-email">Email</Label>
                  <Input
                    id="verify-email"
                    type="email"
                    placeholder="vos@ejemplo.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tiene que ser un correo que no esté registrado en otra cuenta.
                  </p>
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="mt-1 w-full" disabled={submitting}>
                  {submitting ? "Enviando…" : "Enviar código"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="verify-code">Código de verificación</Label>
                  <Input
                    id="verify-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Enviado a <span className="font-medium">{knownEmail}</span>.
                  </p>
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                {devCode ? (
                  <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Entorno de desarrollo: tu código es{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {devCode}
                    </span>
                    . En producción lo recibís por email.
                  </p>
                ) : null}

                <Button type="submit" className="mt-1 w-full" disabled={submitting}>
                  {submitting ? "Verificando…" : "Verificar email"}
                </Button>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEditingEmail(true)}
                    className="text-sm text-muted-foreground underline underline-offset-4"
                  >
                    Cambiar email
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResend}
                    disabled={submitting}
                  >
                    ¿No llegó? Reenviar
                  </Button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground">
              ¿No sos vos?{" "}
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Usar otra cuenta
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <span className="text-sm text-muted-foreground">Cargando…</span>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}