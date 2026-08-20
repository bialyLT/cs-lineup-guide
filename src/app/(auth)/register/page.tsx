"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ username, password });
      // La cuenta nace sin email: el siguiente paso es ingresar el correo
      // y verificarlo (lo maneja /verify-email).
      router.replace("/verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Empezá con usuario y contraseña. Después vas a verificar tu email
          para desbloquear mapas y lineups de CS2.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              type="text"
              placeholder="LineupHunter"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="mt-1 w-full" disabled={submitting}>
            {submitting ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="font-medium text-foreground underline underline-offset-4">
            Iniciá sesión
          </a>
        </p>
      </CardContent>
    </Card>
  );
}