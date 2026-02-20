import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Squad",
};

export default function SquadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
