"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Flame, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { quizService, type AnswerResponse } from "@/lib/api/quiz.service";
import { quizSession } from "@/lib/quiz-session";
import { AnswerOption } from "@/features/quiz/components/answer-option";
import { QuestionCard } from "@/features/quiz/components/question-card";
import { QuestionImage } from "@/features/quiz/components/question-image";
import { QuizFeedback } from "@/features/quiz/components/quiz-feedback";
import { QuizHeader } from "@/features/quiz/components/quiz-header";
import { QuizProgress } from "@/features/quiz/components/quiz-progress";
import { ReferencePoint } from "@/features/quiz/components/reference-point";

const LETTERS = ["A", "B", "C", "D"];
// Espejo de apps/progression/constants.py (XP_PER_CORRECT).
const XP_PER_CORRECT = 20;

type Phase = "answering" | "feedback" | "done";

export default function QuizPage() {
  const router = useRouter();
  const [quiz] = useState(quizSession.load);

  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<AnswerResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quiz) router.replace("/mapas");
  }, [quiz, router]);

  const answer = useMutation({
    mutationFn: (vars: { questionId: string; optionId: string }) =>
      quizService.submitAnswer(vars.questionId, vars.optionId),
    onSuccess: (resp) => {
      setResult(resp);
      if (resp.correct) setCorrectCount((value) => value + 1);
      setPhase("feedback");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo enviar la respuesta.");
    },
  });

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="-mx-4 -mt-8 flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Cargando quiz…</p>
      </div>
    );
  }

  const questions = quiz.questions;
  const question = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const isVisual = question.options.some((option) => option.position);
  const earnedXp = correctCount * XP_PER_CORRECT;
  const earnedCoins = correctCount * 2;

  function handleNext() {
    if (isLast) {
      setPhase("done");
      quizSession.clear();
      return;
    }
    setIndex((value) => value + 1);
    setSelectedId(null);
    setResult(null);
    setPhase("answering");
  }

  function handleRestart() {
    setIndex(0);
    setSelectedId(null);
    setResult(null);
    setCorrectCount(0);
    setError("");
    setPhase("answering");
  }

  function handleFinish() {
    router.replace("/home");
  }

  if (phase === "done") {
    return (
      <div className="-mx-4 -mt-8 flex min-h-dvh flex-col gap-5 px-4">
        <QuizHeader current={total} total={total} title={quiz.title} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="size-7" />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">¡Quiz terminado!</h2>
            <p className="text-sm text-muted-foreground">
              Respondiste {correctCount} de {total} correctas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-warning" />
              +{earnedXp} XP
            </span>
            <Button variant="secondary" size="sm">
              +{earnedCoins} monedas
            </Button>
          </div>

          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <Button size="lg" onClick={handleFinish} className="w-full">
              Volver al inicio
            </Button>
            <Button size="lg" variant="ghost" onClick={handleRestart}>
              Repetir quiz
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-8 flex min-h-dvh flex-col gap-5 px-4">
      <div className="-mx-4">
        <QuizHeader current={index + 1} total={total} title={quiz.title} />
        <QuizProgress value={((index + 1) / total) * 100} className="mx-4" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex flex-1 flex-col gap-5"
        >
          <QuestionCard prompt={question.prompt} helperText={question.helperText} />

          {phase === "feedback" && result ? (
            <QuizFeedback
              state={result.correct ? "correct" : "incorrect"}
              message={
                result.correct
                  ? `¡Correcto! +${XP_PER_CORRECT} XP`
                  : "Incorrecto, seguí practicando"
              }
              streak={result.streak}
            />
          ) : null}

          {phase === "feedback" && error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {isVisual ? (
            <QuestionImage src={question.imageUrl} aspectRatio="aspect-[4/5]">
              {question.options.map((option, i) => {
                if (!option.position) return null;
                let state: "idle" | "selected" | "correct" | "incorrect" = "idle";
                if (phase === "feedback") {
                  state = option.id === selectedId
                    ? result?.correct
                      ? "correct"
                      : "incorrect"
                    : "idle";
                } else if (option.id === selectedId) {
                  state = "selected";
                }
                return (
                  <ReferencePoint
                    key={option.id}
                    position={option.position}
                    state={state}
                    label={i + 1}
                    onClick={phase === "answering" ? () => setSelectedId(option.id) : undefined}
                  />
                );
              })}
            </QuestionImage>
          ) : (
            <div className="flex flex-col gap-2.5">
              {question.options.map((option, i) => {
                let state: "idle" | "selected" | "correct" | "incorrect" = "idle";
                if (phase === "feedback") {
                  state = option.id === selectedId
                    ? result?.correct
                      ? "correct"
                      : "incorrect"
                    : "idle";
                } else if (option.id === selectedId) {
                  state = "selected";
                }
                return (
                  <AnswerOption
                    key={option.id}
                    text={option.text ?? ""}
                    letter={LETTERS[i] ?? String(i + 1)}
                    state={state}
                    onClick={() => setSelectedId(option.id)}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
              <Flame className="size-4 text-warning" />
              <span className="tabular-nums">{result?.streak ?? 0}</span> racha
            </span>
            {phase === "answering" ? (
              <Button
                size="lg"
                className="flex-1"
                disabled={!selectedId || answer.isPending}
                onClick={() => {
                  setError("");
                  if (selectedId) {
                    answer.mutate({ questionId: question.id, optionId: selectedId });
                  }
                }}
              >
                {answer.isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Corrigiendo…
                  </>
                ) : (
                  "Comprobar"
                )}
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={handleNext}>
                {isLast ? "Ver resultado" : "Siguiente"}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}