import { NotSupportedException } from "@/server/api/core/exceptions";
import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return {
    title: `Live  Classes | ${(await parent)?.title?.absolute
      }`,
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  throw new NotSupportedException();
  return children;
}
