"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import AuthButton from "@/components/AuthButton";

interface HeaderProps {
  title: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
  backUrl?: string;
  backLabel?: string;
  showAuth?: boolean;
}

export default function Header({
  title,
  subtitle,
  icon,
  children,
  backUrl,
  backLabel = "Back",
  showAuth = true,
}: HeaderProps) {
  return (
    <header className="flex flex-col xl:flex-row justify-between xl:items-start gap-6 mb-8 md:mb-12 border-b border-slate-200/60 pb-8">
      <div className="flex flex-col md:flex-row gap-6 md:items-center xl:w-1/2">
        {backUrl && (
          <Button
            asChild
            variant="ghost"
            className="w-fit pl-0 hover:bg-transparent text-slate-500 hover:text-blue-600 self-start md:self-center shrink-0"
          >
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Link>
          </Button>
        )}

        <div className="flex items-start gap-5 group">
          {icon && (
            <div className="hidden md:flex p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100 ring-4 ring-slate-50 transition-transform duration-300 group-hover:scale-105 shrink-0">
              <div className="text-blue-600">
                {icon}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </div>
            {subtitle && (
              <p className="text-slate-500 text-base md:text-lg font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 xl:w-1/2 xl:justify-end">
        {children}
        {showAuth && (
          <div className="pl-3 border-l border-slate-200/60 hidden sm:block">
            <AuthButton />
          </div>
        )}
        {showAuth && (
           <div className="w-full sm:hidden mt-2 pt-4 border-t border-slate-100">
             <AuthButton />
           </div>
        )}
      </div>
    </header>
  );
}
