import type { Metadata } from "next";
import { LandingPage } from "./components/landing/LandingPage";

const title = "WatchLLM — Agent reliability, from first run to production.";
const description =
  "Stress test. Replay. Fix. Ship. The agent reliability platform: stress-test failure modes, graph replay every run, fork and replay from any node.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    url: "https://watchllm.dev",
    siteName: "WatchLLM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Home() {
  return <LandingPage />;
}
