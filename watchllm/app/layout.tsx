import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "WatchLLM - Chaos Monkey for AI Agents",
  description:
    "Pre-deployment chaos testing for AI agents. Targeted adversarial attacks across 6 failure categories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#f73b00",
          colorDanger: "#f5475c",
          fontFamily: '"IBM Plex Mono", monospace',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
