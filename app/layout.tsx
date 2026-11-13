import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Korean Community @ BU",
  description: "Academics, sports, and housing for Korean students at Boston University",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className="flex min-h-full flex-col bg-gray-50 text-gray-900">
          <Navbar />
          <div className="flex-1">{children}</div>
          <footer className="border-t bg-white py-4 text-center text-sm text-gray-500">
            Korean Community · BU LIKELION
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
