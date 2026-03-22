import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Failures",
};

export default function FailuresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
