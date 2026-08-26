import type { Metadata } from "next";

export const metadata: Metadata = { title: "Management-V1", description: "Workshop payroll management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f7f9", color: "#111" }}>
        {children}
      </body>
    </html>
  );
}
