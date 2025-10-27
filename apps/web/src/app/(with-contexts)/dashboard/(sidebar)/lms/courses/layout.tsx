import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return {
    title: `Courses | ${(await parent)?.title?.absolute || "Uyren AI"}`,
  };
}
 
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
