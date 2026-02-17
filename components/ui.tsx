import { ButtonHTMLAttributes, PropsWithChildren } from "react";

export const Card = ({ children }: PropsWithChildren) => (
  <section
    style={{
      background: "var(--color-surface)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-5)"
    }}
  >
    {children}
  </section>
);

export const Button = ({ children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
  <button
    {...props}
    style={{
      width: "100%",
      border: "none",
      cursor: "pointer",
      background: "var(--color-primary)",
      color: "var(--color-primary-contrast)",
      borderRadius: "var(--radius-md)",
      padding: "var(--space-3) var(--space-4)",
      fontSize: "var(--font-size-2)"
    }}
  >
    {children}
  </button>
);

export const StatTile = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "var(--font-size-1)" }}>{label}</p>
    <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--font-size-3)", fontWeight: 700 }}>{value}</p>
  </Card>
);
