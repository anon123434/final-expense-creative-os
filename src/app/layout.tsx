import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Final Expense Creative OS",
  description: "Generate ad concepts, scripts, voiceovers, scene plans, and image prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
