import "./globals.css";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "BrainBolt",
  description: "Adaptive infinite quiz platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-6)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <h1 style={{ margin: 0 }}>BrainBolt</h1>
            <nav style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
              <Link href="/">Quiz</Link>
              <Link href="/leaderboard">Leaderboard (SSR)</Link>
              <Link href="/llm-design">LLD</Link>
              <ThemeToggle />
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
