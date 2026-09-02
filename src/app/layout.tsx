import type { Metadata } from "next";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ptBr } from "@/lib/data/strings";
import { SessionProvider } from "@/components/auth/session-provider";
import { getSession } from "@/server/auth-guard";
import "./globals.css";

// Servidas pelo next/font: sem request extra ao Google no carregamento da
// pagina e sem flash de fonte trocando depois que a tela ja apareceu.
const headline = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-headline",
  display: "swap",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: ptBr.header.title,
  description: "Generate professional safety documents (APR, APT) with AI assistance.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const initialUser = session
    ? {
        uid: session.uid,
        email: session.email ?? '',
        name: session.email ?? 'Usuario',
        role: session.role,
        companyId: session.companyId,
      }
    : null;

  return (
    <html
      lang="pt-BR"
      className={`${headline.variable} ${body.variable}`}
      suppressHydrationWarning={true}
    >
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <SessionProvider initialUser={initialUser}>
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
