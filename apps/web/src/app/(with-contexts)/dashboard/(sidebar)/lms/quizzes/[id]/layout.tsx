"use client";

import { QuizProvider } from "../_components/quiz-context";
import { useParams } from "next/navigation";

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const initialMode = quizId === "new" ? "create" : "edit";

  return (
    <QuizProvider
      initialMode={initialMode}
      initialData={quizId !== "new" ? { _id: quizId } : null}
    >
      {children}
    </QuizProvider>
  );
}

