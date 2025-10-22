import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { ReactNode } from "react";

interface ErrorComponentProps {
  children: ReactNode;
}

interface ErrorCardProps {
  children: ReactNode;
}

interface ErrorIconProps {
  children: ReactNode;
}

interface ErrorTitleProps {
  children: ReactNode;
}

interface ErrorDescriptionProps {
  children: ReactNode;
}

interface ErrorActionsProps {
  children: ReactNode;
}

function ErrorComponentRoot({ children }: ErrorComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {children}
    </div>
  );
}

function ErrorCard({ children }: ErrorCardProps) {
  return (
    <Card className="max-w-md w-full">
      {children}
    </Card>
  );
}

function ErrorCardHeader({ children }: ErrorCardProps) {
  return (
    <CardHeader className="text-center space-y-4">
      {children}
    </CardHeader>
  );
}

function ErrorIcon({ children }: ErrorIconProps) {
  return (
    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
      {children}
    </div>
  );
}

function ErrorTitle({ children }: ErrorTitleProps) {
  return (
    <CardTitle className="text-2xl">
      {children}
    </CardTitle>
  );
}

function ErrorDescription({ children }: ErrorDescriptionProps) {
  return (
    <CardDescription className="text-base">
      {children}
    </CardDescription>
  );
}

function ErrorCardBody({ children }: ErrorActionsProps) {
  return (
    <CardContent className="flex justify-center">
      {children}
    </CardContent>
  );
}

export const ErrorComponent = Object.assign(ErrorComponentRoot, {
  Card: ErrorCard,
  CardHeader: ErrorCardHeader,
  Icon: ErrorIcon,
  Title: ErrorTitle,
  Description: ErrorDescription,
  CardBody: ErrorCardBody,
});

