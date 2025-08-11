import React from "react";
import type { ThemeStyle } from "@workspace/page-models";

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
}
