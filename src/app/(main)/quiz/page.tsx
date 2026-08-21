"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Flame, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InterstitialAd } from "@/components/ads/interstitial-ad";
import { quizService, type AnswerResponse } from "@/lib/api/quiz.service";
import { userService } from "@/lib/api/user.service";
import { quizSession } from "@/lib/quiz-session";
import { AnswerOption } from "@/features/quiz/components/answer-option";
import { QuestionCard } from "@/features/quiz/components/question-card";
import { QuestionImage } from "@/features/quiz/components/question-image";
import { QuizFeedback } from "@/features/quiz/components/quiz-feedback";
import { QuizHeader } from "@/features/quiz/components/quiz-header";
import { QuizProgress } from "@/features/quiz/components/quiz-progress";
import { ReferencePoint } from "@/features/quiz/components/reference-point";

const LETTERS = ["A", "B", "C", "D"];
// Espejo de apps/progression/constants.py.
const XP_PER_CORRECT = 25;
const COINS_PER_CORRECT = 30;
// Tipos donde conviene mostrar el título del lineup como referencia.
const LINEUP_TITLE_TYPES = ["reference", "key_combo", "player_position"];

type Phase = "answering" | "feedback" | "done";
export default function QuizPage() {
  const router = useRouter();
  const [quiz] = useState(quizSession.load);

  const [index, setIndex] = useState(() => {
    const saved = quizSession.loadIndex();
    const length = quiz?.questions.length ?? 0;
    return Math.min(saved, Math.max(length - 1, 0));
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [correctCount, setCorrectCount] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [result, setResult] = useState<AnswerResponse | null>(null);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<"restart" | "home" | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timeoutFired = useRef(false);

  useEffect(() => {
    if (!quiz) router.replace("/quiz/crear");
  }, [quiz, router]);

  const answer = useMutation({
    mutationFn: (vars: { questionId: string; optionId: string | null }) => {
      if (!quiz) throw new Error("Quiz no disponible.");
      return quizService.submitAnswer(quiz.id, vars.questionId, vars.optionId);
    },
    onSuccess: (resp) => {
      setResult(resp);
      if (resp.correct) setCorrectCount((value) => value + 1);
      if (resp.correct && resp.awarded) {
        setEarnedXp((value) => value + XP_PER_CORRECT);
        setEarnedCoins((value) => value + COINS_PER_CORRECT);
      }
      setPhase("feedback");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo enviar la respuesta.");
    },
  });

  // Racha real del usuario antes de empezar a responder (la respuesta del
  // servidor la pisa una vez se responde la primera pregunta).
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: userService.me });
  const currentStreak = me?.progression.streak ?? 0;

  // Timer solo en dificultad difícil (secondsPerQuestion definido por el backend).
  const timerSeconds = quiz?.secondsPerQuestion ?? null;
  const timerActive = typeof timerSeconds === "number" && timerSeconds > 0;

  // El timer se reinicia en cada pregunta y corre solo durante "answering".
  useEffect(() => {
    timeoutFired.current = false;
  }, [index]);

  useEffect(() => {
    if (!timerActive || phase !== "answering") return;
    setTimeLeft(timerSeconds);
    const id = setInterval(
      () => setTimeLeft((value) => Math.max(0, (value ?? 0) - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [index, phase, timerSeconds, timerActive]);

  useEffect(() => {
    if (timerActive && phase === "answering" && timeLeft === 0 && !timeoutFired.current) {
      timeoutFired.current = true;
      handleTimeout();
    }
  }, [timeLeft, phase, timerActive]);

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
  // Solo estos tipos se dibujan como puntos dentro de la imagen; el resto
  // (utilidad, combinación de teclas, dónde cae la utilidad) va como lista abajo.
  const VISUAL_TYPES = ["reference", "player_position", "map_location"];
  const isVisual = VISUAL_TYPES.includes(question.type);

  function handleNext() {
    if (isLast) {
      setPhase("done");
      quizSession.clear();
      return;
    }
    const next = index + 1;
    setIndex(next);
    quizSession.saveIndex(next);
    setSelectedId(null);
    setResult(null);
    setPhase("answering");
  }

  function handleRestart() {
    setPendingAction("restart");
  }

  function handleFinish() {
    setPendingAction("home");
  }

  function handleAdClose() {
    const action = pendingAction;
    setPendingAction(null);
    if (action === "home") {
      router.replace("/home");
    } else if (action === "restart") {
      setIndex(0);
      setSelectedId(null);
      setResult(null);
      setCorrectCount(0);
      setEarnedXp(0);
      setEarnedCoins(0);
      setError("");
      setPhase("answering");
    }
  }

  // Al vencer el tiempo se envía la pregunta como incorrecta (rompe la racha).
  function handleTimeout() {
    if (!quiz) return;
    if (answer.isPending) return;
    answer.mutate({ questionId: question.id, optionId: null });
  }

  // Durante el feedback se destaca la opción correcta aunque el usuario haya fallado.
  function optionState(
    optionId: string,
  ): "idle" | "selected" | "correct" | "incorrect" {
    if (phase === "feedback" && result) {
      if (result.correctOptionId && optionId === result.correctOptionId) {
        return "correct";
      }
      if (optionId === selectedId) return "incorrect";
      return "idle";
    }
    return optionId === selectedId ? "selected" : "idle";
  }

  // Texto de la respuesta correcta (preguntas con opciones de texto).
  const correctAnswerText =
    phase === "feedback" && result?.correctOptionId
      ? question.options.find((o) => o.id === result.correctOptionId)?.text
      : undefined;

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

        <InterstitialAd
          open={pendingAction !== null}
          ready
          onClose={handleAdClose}
        />
      </div>
  );
}

  return (
    <div className="-mx-4 -mt-8 flex min-h-dvh flex-col gap-3 overflow-y-auto px-4 pb-4">
      <div className="-mx-4 shrink-0">
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
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          <QuestionCard
            prompt={question.prompt}
            helperText={question.helperText}
            lineupTitle={
              LINEUP_TITLE_TYPES.includes(question.type)
                ? question.lineupTitle
                : undefined
            }
          />

          {timerActive ? (
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-warning transition-[width] duration-1000 ease-linear"
                  style={{
                    width: `${timerSeconds ? ((timeLeft ?? timerSeconds) / timerSeconds) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="min-w-10 text-right text-sm font-semibold tabular-nums text-muted-foreground">
                {timeLeft ?? timerSeconds}s
              </span>
            </div>
          ) : null}

          {phase === "feedback" && result ? (
            <QuizFeedback
              state={result.correct ? "correct" : "incorrect"}
              message={
                result.correct
                  ? result.awarded
                    ? `¡Correcto! +${XP_PER_CORRECT} XP`
                    : "¡Correcto!"
                  : "Incorrecto"
              }
              correctAnswer={correctAnswerText}
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
                return (
                  <ReferencePoint
                    key={option.id}
                    position={option.position}
                    state={optionState(option.id)}
                    label={option.text || String(i + 1)}
                    onClick={phase === "answering" ? () => setSelectedId(option.id) : undefined}
                  />
                );
              })}
            </QuestionImage>
          ) : (
            <>
              <QuestionImage src={question.imageUrl} aspectRatio="aspect-[4/5]" />
              <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
                {question.options.map((option, i) => (
                  <AnswerOption
                    key={option.id}
                    text={option.text ?? ""}
                    letter={LETTERS[i] ?? String(i + 1)}
                    state={optionState(option.id)}
                    onClick={() => setSelectedId(option.id)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-auto flex shrink-0 items-center justify-between gap-3 pt-1">
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
              <Flame className="size-4 text-warning" />
              <span className="tabular-nums">{result?.streak ?? currentStreak}</span> racha
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