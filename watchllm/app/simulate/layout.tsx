import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulation",
};

export default function SimulateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
