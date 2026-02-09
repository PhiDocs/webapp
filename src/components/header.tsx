'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/icons/logo';
import { FileText, FolderOpen } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
  children?: React.ReactNode;
}

export function Header({
  className,
  children
}: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className={cn("sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm", className)}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground font-headline">
              {ptBr.header.title}
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/reports"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === '/reports'
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <FileText className="h-4 w-4" />
              Relatórios
            </Link>
            <Link
              href="/documents"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === '/documents'
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Documentos
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {children}
        </div>
      </div>
    </header>
  );
}
