import { Metadata, ResolvingMetadata } from "next";
import { authOptions } from "@/lib/auth/options";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "./forgot-password-form";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return {
    title: `Forgot Password | ${(await parent)?.title?.absolute}`,
  };
}

export default async function ForgotPasswordPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return <ForgotPasswordForm />;
}

