"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@workspace/components-library";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const LOGIN_URL = "/auth/sign-in";

const Logout = () => {
  const router = useRouter();
  const { status } = useSession();
  const { toast } = useToast();
  const { t } = useTranslation("auth");

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut({ callbackUrl: LOGIN_URL });

        toast({
          title: t("logout.signing_out"),
          description: t("logout.signed_out"),
        });

        router.replace(LOGIN_URL);
      } catch (error) {
        console.error("Logout error:", error);
        toast({
          title: t("logout.error_title"),
          description: t("logout.error_description"),
          variant: "destructive",
        });

        router.replace(LOGIN_URL);
      }
    };

    if (status === "authenticated") {
      handleLogout();
    } else if (status === "unauthenticated") {
      router.replace(LOGIN_URL);
    }
  }, [status, router, toast, t]);

  return <div>{t("logout.logging_out")}</div>;
};

export default Logout;
