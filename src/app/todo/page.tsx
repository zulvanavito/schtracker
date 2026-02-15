"use client";

import Header from "@/components/Header";
import TodoList from "@/components/TodoList";
import { CheckSquare, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TodoPage() {
  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-indigo-50 to-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <Header
          title="To-Do List"
          subtitle="Manage your daily tasks and priorities."
          icon={<CheckSquare className="h-8 w-8" />}
        >
          <Button
            asChild
            className="gap-2 h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shadow-blue-200 transition-all"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </Header>

        <div className="flex-1 min-h-[500px]">
            <TodoList className="h-full shadow-xl shadow-blue-500/5" listClassName="max-h-[60vh]" />
        </div>
      </div>
    </div>
  );
}
