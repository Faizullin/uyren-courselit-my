"use client";

import { List } from "lucide-react";
import React from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useToolbar } from "./toolbar-provider";

const BulletListToolbar = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const { editor } = useToolbar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 p-0 sm:h-9 sm:w-9",
            editor?.isActive("bulletList") && "bg-accent",
            className,
          )}
          onClick={(e) => {
            editor?.chain().focus().toggleBulletList().run();
            onClick?.(e);
          }}
          disabled={!editor?.can().chain().focus().toggleBulletList().run()}
          ref={ref}
          {...props}
        >
          {children ?? <List className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>Bullet list</span>
      </TooltipContent>
    </Tooltip>
  );
});

BulletListToolbar.displayName = "BulletListToolbar";

export { BulletListToolbar };
