import { QuizProvider } from "../_components/quiz-context";

export default async function Layout({ 
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const quizId = (await params).id;
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

