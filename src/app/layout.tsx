import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { ptBr } from "@/lib/data/strings";
import { SessionProvider } from "@/components/auth/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: ptBr.header.title,
  description: "Generate professional safety documents (APR, APT) with AI assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster />
        <footer className="fixed bottom-0 right-0 p-2 text-[10px] text-muted-foreground/50 pointer-events-none select-none z-50">
          {process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}
        </footer>
      </body>
    </html>
  );
}
