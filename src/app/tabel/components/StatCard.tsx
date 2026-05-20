import React from "react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  delay?: string;
}

export default function StatCard({ icon, label, value, color, delay }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden bg-white p-5 rounded-xl border border-border shadow-none hover:shadow-notion-2 transition-all duration-300 group ${delay}`}>
      <div className="flex items-center gap-4 relative z-10">
          <div className={`p-2.5 rounded-lg ${color} shadow-none group-hover:scale-105 transition-transform duration-300 shrink-0`}>
              {icon}
          </div>
          <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5 truncate">{label}</p>
              <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{value}</h3>
          </div>
      </div>
    </div>
  );
}
