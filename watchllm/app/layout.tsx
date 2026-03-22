import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://watchllm.dev"),
  title: {
    default: "WatchLLM — Agent reliability, from first run to production.",
    template: "%s — WatchLLM",
  },
  description:
    "Stress test. Replay. Fix. Ship. The agent reliability platform for stress-testing agents, graph replay, and fork-and-replay debugging.",
  openGraph: {
    type: "website",
    siteName: "WatchLLM",
  },
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
