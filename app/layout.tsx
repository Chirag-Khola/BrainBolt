import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "BrainBolt",
  description: "Adaptive infinite quiz platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
            <h1 style={{ margin: 0 }}>BrainBolt</h1>
            <nav style={{ display: "flex", gap: "var(--space-4)" }}>
              <Link href="/">Quiz</Link>
              <Link href="/leaderboard">Leaderboard (SSR)</Link>
              <Link href="/llm-design">LLD</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
