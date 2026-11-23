import type { ReactNode } from "react";
import { RootShell, shellMetadata, shellViewport } from "@/components/RootShell";
import "../globals.css";

export const metadata = shellMetadata;
export const viewport = shellViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
