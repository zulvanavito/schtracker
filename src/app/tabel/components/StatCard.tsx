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
    <div className={`relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group ${delay}`}>
      <div className="flex items-center gap-4 relative z-10">
          <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
              {icon}
          </div>
          <div>
              <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
          </div>
      </div>
    </div>
  );
}
