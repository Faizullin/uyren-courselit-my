import { NotSupportedException } from "@/server/api/core/exceptions";
import { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
    _: any,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `Student Dashboard | ${(await parent)?.title?.absolute}`,
    };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    throw new NotSupportedException();
    return children;
}