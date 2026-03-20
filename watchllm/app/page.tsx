import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export default async function Home() {
  const htmlPath = path.join(process.cwd(), "index.html");
  const html = await readFile(htmlPath, "utf-8");

  return (
    <iframe
      title="WatchLLM landing page"
      srcDoc={html}
      style={{
        width: "100%",
        minHeight: "100vh",
        border: "0",
        display: "block",
        background: "transparent",
      }}
    />
  );
}
