"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mockQuiz } from "@/features/quiz/mock";
import { AnswerOption } from "@/features/quiz/components/answer-option";
import { QuestionCard } from "@/features/quiz/components/question-card";
import { QuestionImage } from "@/features/quiz/components/question-image";
import { QuizFeedback } from "@/features/quiz/components/quiz-feedback";
import { QuizHeader } from "@/features/quiz/components/quiz-header";
import { QuizProgress } from "@/features/quiz/components/quiz-progress";
import { ReferencePoint } from "@/features/quiz/components/reference-point";

const LETTERS = ["A", "B", "C", "D"];

type Phase = "answering" | "feedback";

export default function QuizPage() {
  const questions = mockQuiz.questions;
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [streak, setStreak] = useState(8);

  const question = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const isVisual = question.options.some((option) => option.position);

  const selectedOption = question.options.find((option) => option.id === selectedId);
  const isCorrect =
    phase === "feedback" && selectedOption?.isCorrect === true;

  function handleCheck() {
    if (!selectedId) return;
    if (selectedOption?.isCorrect) {
      setStreak((value) => value + 1);
    } else {
      setStreak(0);
    }
    setPhase("feedback");
  }

  function handleNext() {
    if (isLast) {
      setIndex(0);
      setStreak(8);
    } else {
      setIndex((value) => value + 1);
    }
    setSelectedId(null);
    setPhase("answering");
  }

  return (
    <div className="-mx-4 -mt-8 flex min-h-dvh flex-col gap-5 px-4">
      <div className="-mx-4">
        <QuizHeader current={index + 1} total={total} title={mockQuiz.title} />
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

          {phase === "feedback" ? (
            <QuizFeedback
              state={isCorrect ? "correct" : "incorrect"}
              streak={streak}
            />
          ) : null}

          {isVisual ? (
            <QuestionImage aspectRatio="aspect-[4/5]" placeholderLabel="Mirage">
              {question.options.map((option, i) => {
                if (!option.position) return null;
                let state: "idle" | "selected" | "correct" | "incorrect" = "idle";
                if (phase === "feedback") {
                  state = option.isCorrect ? "correct" : option.id === selectedId ? "incorrect" : "idle";
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
                  state = option.isCorrect ? "correct" : option.id === selectedId ? "incorrect" : "idle";
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
              <span className="tabular-nums">{streak}</span> racha
            </span>
            {phase === "answering" ? (
              <Button size="lg" className="flex-1" disabled={!selectedId} onClick={handleCheck}>
                Comprobar
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={handleNext}>
                {isLast ? "Reiniciar" : "Siguiente"}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}