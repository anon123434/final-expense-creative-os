import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="feco-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
