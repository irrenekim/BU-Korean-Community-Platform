import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import AppShell from "@/components/Navbar";
import { ThemeSync } from "@/components/ThemePicker";
import { themeBootScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Korean Community @ BU",
  description: "Academics, sports, and housing for Korean students at Boston University",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased" data-theme="minimal" data-mode="light" suppressHydrationWarning>
        <head>
          {/* Applies the saved theme before the page draws (no flash) */}
          <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
          {/* Pretendard: the font many Korean apps use; looks good in Korean and English */}
          <link rel="stylesheet"
            href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        </head>
        <body className="min-h-full bg-paper text-ink">
          <ThemeSync />
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
