import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Math Flashcards",
  description: "Practice math facts with flashcards and timed drills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${nunito.variable} antialiased min-h-screen`}
        style={{ fontFamily: "'Nunito', sans-serif", background: '#FFF8F0' }}
      >
        <nav className="sticky top-0 z-50 border-b-4 border-amber-400 shadow-md" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #F97316 25%, #EAB308 50%, #22C55E 75%, #3B82F6 100%)' }}>
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              <span className="text-2xl">&#x270F;&#xFE0F;</span>
              <span className="text-xl font-bold text-white drop-shadow-md tracking-wide">
                Math Flashcards
              </span>
            </Link>
            <div className="flex gap-1">
              <Link
                href="/settings"
                className="px-3 py-1.5 text-sm font-bold text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-all"
              >
                Settings
              </Link>
              <Link
                href="/history"
                className="px-3 py-1.5 text-sm font-bold text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-all"
              >
                History
              </Link>
              <Link
                href="/"
                className="px-3 py-1.5 text-sm font-bold text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-all"
              >
                Players
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
