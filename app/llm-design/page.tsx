import fs from "node:fs/promises";
import path from "node:path";

export default async function LldPage() {
  const content = await fs.readFile(path.join(process.cwd(), "docs/LLD.md"), "utf8");
  return (
    <article style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
      {content}
    </article>
  );
}
