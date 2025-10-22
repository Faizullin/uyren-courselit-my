import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export function CreateButton(props: {
  href?: string;
  text?: string;
  link?: boolean;
  onClick?: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const { href, text, onClick } = props;
  const isLink = !!href;
  const newDefaultText = t("create_button.new");
  if (isLink) {
    return (
      <Button asChild>
        <Link href={href || ""}>
          <Plus className="h-4 w-4 mr-2" />
          {text || newDefaultText}
        </Link>
      </Button>
    );
  } else {
    return (
      <Button onClick={onClick}>
        <Plus className="h-4 w-4 mr-2" />
          {text || newDefaultText}
      </Button>
    );
  }
}
