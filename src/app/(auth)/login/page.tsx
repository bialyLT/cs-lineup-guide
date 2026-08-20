"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { GoogleLogin } from "@react-oauth/google";

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.replace(user.isEmailVerified ? "/home" : "/verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(response: {
    credential?: string;
  }) {
    setError("");
    if (!response.credential) {
      setError("Google no devolvió un token.");
      return;
    }
    try {
      const user = await loginWithGoogle(response.credential);
      router.replace(user.isEmailVerified ? "/home" : "/verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión con Google.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Continuá tu racha y seguí practicando lineups.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("El login con Google falló.")}
          text="continue_with"
        />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          o con usuario
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email o usuario</Label>
            <Input
              id="email"
              type="text"
              placeholder="vos@ejemplo.com"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="mt-1 w-full"
            disabled={submitting}
          >
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Todavía no tenés cuenta?{" "}
          <a href="/register" className="font-medium text-foreground underline underline-offset-4">
            Registrate
          </a>
        </p>
      </CardContent>
    </Card>
  );
}