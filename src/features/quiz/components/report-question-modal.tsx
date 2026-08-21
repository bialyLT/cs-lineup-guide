"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { quizService, REPORT_REASONS, type ReportReason } from "@/lib/api/quiz.service";
import type { Question } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  reference: "Referencia",
  utility: "Utilidad",
  landing_spot: "Dónde cae",
  key_combo: "Teclas",
  player_position: "Jugador",
  map_location: "Lugares",
};

export function ReportQuestionModal({
  questions,
  onClose,
}: {
  questions: Question[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"select" | "reason">("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function selectQuestion(question: Question) {
    setSelectedId(question.id);
    setSelectedPrompt(question.prompt);
    setReason(null);
    setDetail("");
    setStep("reason");
  }

  async function submit() {
    if (!selectedId || !reason) return;
    setSubmitting(true);
    setError("");
    try {
      await quizService.reportQuestion(
        selectedId,
        reason,
        reason === "otro" ? detail.trim() : "",
      );
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el reporte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-background p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {done ? "Reporte enviado" : "Reportar una pregunta"}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              ¡Gracias! Revisaremos la pregunta y la corregiremos si hace falta.
            </p>
            <Button className="w-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : step === "select" ? (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-sm text-muted-foreground">
              Elegí la pregunta que querés reportar.
            </p>
            <div className="max-h-[55vh] overflow-y-auto">
              {questions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => selectQuestion(question)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-xl border border-border px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABELS[question.type] ?? question.type}
                  </span>
                  <span className="text-sm">{question.prompt}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-1 w-full" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Pregunta:</span>{" "}
              {selectedPrompt}
            </p>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value)}
                  className={
                    "rounded-xl border px-3 py-2 text-left text-sm transition-colors " +
                    (reason === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted")
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {reason === "otro" ? (
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="Describí el problema…"
                rows={3}
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setStep("select")}
                disabled={submitting}
              >
                Volver
              </Button>
              <Button
                className="flex-1"
                onClick={submit}
                disabled={
                  !reason ||
                  submitting ||
                  (reason === "otro" && detail.trim().length === 0)
                }
              >
                {submitting ? "Enviando…" : "Enviar reporte"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
