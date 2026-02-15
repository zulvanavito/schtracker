"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Edit2, X, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Assuming sonner is used based on package.json

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

interface TodoListProps {
  className?: string;
  listClassName?: string;
}

export default function TodoList({ className, listClassName }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      if (data.success) {
        setTodos(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch todos", error);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTodo.trim()) return;

    setAdding(true);
    try {
        const res = await fetch("/api/todos", {
            method: "POST",
            body: JSON.stringify({ title: newTodo }),
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        
        if (data.success) {
            setTodos([data.data, ...todos]);
            setNewTodo("");
            toast.success("Tugas berhasil ditambahkan");
        } else {
            toast.error("Gagal menambahkan tugas");
        }
    } catch (error) {
        toast.error("Terjadi kesalahan");
    } finally {
        setAdding(false);
    }
  };

  const toggleTodo = async (id: number, currentStatus: boolean) => {
      // Optimistic update
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));

      try {
          const res = await fetch("/api/todos", {
              method: "PATCH",
              body: JSON.stringify({ id, completed: !currentStatus }),
              headers: { "Content-Type": "application/json" },
          });
          const data = await res.json();
          if (!data.success) {
              // Revert if failed
              setTodos(todos.map(t => t.id === id ? { ...t, completed: currentStatus } : t));
              toast.error("Gagal update status");
          }
      } catch (error) {
           setTodos(todos.map(t => t.id === id ? { ...t, completed: currentStatus } : t));
           toast.error("Terjadi kesalahan");
      }
  }

  const deleteTodo = async (id: number) => {
      // Optimistic update
      const oldTodos = [...todos];
      setTodos(todos.filter(t => t.id !== id));

      try {
          const res = await fetch(`/api/todos?id=${id}`, {
              method: "DELETE",
          });
          const data = await res.json();
          if (!data.success) {
             setTodos(oldTodos);
             toast.error("Gagal menghapus tugas");
          } else {
              toast.success("Tugas dihapus");
          }
      } catch (error) {
          setTodos(oldTodos);
          toast.error("Terjadi kesalahan");
      }
  }

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const saveEdit = async (id: number) => {
    if (!editTitle.trim()) return;

    // Optimistic update
    const oldTodos = [...todos];
    setTodos(todos.map(t => t.id === id ? { ...t, title: editTitle } : t));
    setEditingId(null);

    try {
        const res = await fetch("/api/todos", {
            method: "PATCH",
            body: JSON.stringify({ id, title: editTitle }),
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        
        if (!data.success) {
            setTodos(oldTodos);
            toast.error("Gagal update tugas");
        } else {
            toast.success("Tugas diupdate");
        }
    } catch (error) {
        setTodos(oldTodos);
        toast.error("Terjadi kesalahan");
    }
  };

  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full ${className}`}>
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">To-Do List</h3>
                <p className="text-xs text-slate-500 font-medium">Catatan & Tugas Harian</p>
            </div>
        </div>
        <div className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-500">
            {todos.filter(t => t.completed).length}/{todos.length} Selesai
        </div>
      </div>
      
      <div className="p-4 border-b border-slate-100 bg-white">
        <form onSubmit={addTodo} className="flex gap-2">
            <Input 
                placeholder="Tulis tugas baru..." 
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className="border-slate-200 focus:ring-blue-100 focus:border-blue-400 rounded-xl"
            />
            <Button 
                type="submit" 
                disabled={adding || !newTodo.trim()}
                size="icon"
                className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
            >
                <Plus className="h-5 w-5" />
            </Button>
        </form>
      </div>

      <div className={`flex-1 overflow-y-auto p-2 space-y-1 ${listClassName || "max-h-[400px]"}`}>
        {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Memuat tugas...</div>
        ) : todos.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Belum ada tugas</p>
            </div>
        ) : (
            todos.map((todo) => (
                <div 
                    key={todo.id} 
                    className={`group flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${
                        todo.completed ? "bg-slate-50" : "hover:bg-blue-50/50 bg-white"
                    }`}
                >
                    <Checkbox 
                        checked={todo.completed} 
                        onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                    />
                    
                    {editingId === todo.id ? (
                        <div className="flex-1 flex items-center gap-2">
                            <Input 
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(todo.id);
                                    if (e.key === "Escape") cancelEditing();
                                }}
                            />
                            <button 
                                onClick={() => saveEdit(todo.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={cancelEditing}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className={`flex-1 text-sm font-medium transition-colors ${
                                todo.completed ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"
                            }`}>
                                {todo.title}
                            </span>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => startEditing(todo)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => deleteTodo(todo.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
}
