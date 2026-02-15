"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ArrowLeft, 
  Clock, 
  Info, 
  Map, 
  MonitorPlay,
  RefreshCw,
  Activity,
  Calendar,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Link2
} from "lucide-react";

import { calculateDurationInMs, formatSchLeadsToUrl } from "@/lib/utils";
import Header from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Jadwal {
  id: number;
  status: string;
  nama_outlet: string;
  sch_leads: string;
  no_invoice: string;
  tipe_outlet: string;
  tipe_langganan: string;
  tanggal_instalasi: string;
}

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Jadwal[]>([]);
  const [stats, setStats] = useState({
    onlineHours: 0,
    offlineHours: 0,
    totalHours: 0,
    onlineCount: 0,
    offlineCount: 0,
  });
  const [subscriptionStats, setSubscriptionStats] = useState<{ name: string; value: number }[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/get-jadwal?status=Fix Schedule", {
        cache: "no-store",
      });
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        processData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (items: Jadwal[]) => {
    // Double check status client-side just in case
    const fixScheduleItems = items.filter(
      (item) => item.status === "Fix Schedule"
    );

    let onlineMs = 0;
    let offlineMs = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    fixScheduleItems.forEach((item) => {
      const duration = calculateDurationInMs(item);
      if (item.tipe_outlet === "Online") {
        onlineMs += duration;
        onlineCount++;
      } else if (item.tipe_outlet === "Offline") {
        offlineMs += duration;
        offlineCount++;
      }
    });

    setStats({
      onlineHours: onlineMs / (1000 * 60 * 60),
      offlineHours: offlineMs / (1000 * 60 * 60),
      totalHours: (onlineMs + offlineMs) / (1000 * 60 * 60),
      onlineCount,
      offlineCount,
    });
    
    // Process subscription stats
    const subCounts: Record<string, number> = {};
    fixScheduleItems.forEach(item => {
        const type = item.tipe_langganan || "Unknown";
        subCounts[type] = (subCounts[type] || 0) + 1;
    });
    
    const subStatsArray = Object.entries(subCounts).map(([name, value]) => ({
        name,
        value
    })).sort((a, b) => b.value - a.value);
    
    setSubscriptionStats(subStatsArray);

    setData(fixScheduleItems);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <Header
          title="Ringkasan Aktivitas"
          subtitle="Total jam aktivitas untuk status Fix Schedule."
          icon={<Activity className="h-8 w-8" />}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            className="rounded-xl border-slate-200 hover:bg-white hover:text-blue-600"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50"
          >
            <Link href="/tabel">
              <FileText className="h-4 w-4" />
              Data Tabel
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50"
          >
            <Link href="/jadwal">
              <Calendar className="h-4 w-4" />
              Kalender
            </Link>
          </Button>
          <Button
            asChild
            className="gap-2 h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shadow-blue-200 transition-all"
          >
            <Link href="/">
              <Sparkles className="h-4 w-4" />
              Jadwal Baru
            </Link>
          </Button>
        </Header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {/* Total Card */}
           <Card className="border-0 shadow-xl shadow-blue-500/10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Clock className="w-32 h-32" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-100 font-medium text-sm uppercase tracking-wider">Total Durasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tighter">
                    {loading ? "..." : stats.totalHours}
                  </span>
                  <span className="text-xl font-medium text-blue-200">Jam</span>
                </div>
                <p className="text-blue-100/80 mt-4 text-sm font-medium">
                  Dari {loading ? "..." : stats.onlineCount + stats.offlineCount} aktivitas terjadwal
                </p>
              </CardContent>
           </Card>

           {/* Online Card */}
           <Card className="border-white/60 bg-white/60 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl hover:-translate-y-1 transition-transform duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-slate-500 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                   <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <MonitorPlay className="h-4 w-4" />
                   </div>
                   Online
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-bold text-slate-800">
                    {loading ? "..." : stats.onlineHours}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">Jam</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Aktivitas</span>
                    <span className="text-lg font-bold text-slate-700">{stats.onlineCount}</span>
                </div>
              </CardContent>
           </Card>

           {/* Offline Card */}
           <Card className="border-white/60 bg-white/60 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl hover:-translate-y-1 transition-transform duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-slate-500 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                   <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                      <Map className="h-4 w-4" />
                   </div>
                   Offline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-bold text-slate-800">
                    {loading ? "..." : stats.offlineHours}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">Jam</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Aktivitas</span>
                    <span className="text-lg font-bold text-slate-700">{stats.offlineCount}</span>
                </div>
              </CardContent>
           </Card>
        </div>

        {/* Charts Section */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Outlet Distribution Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Distribusi Outlet</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Online", value: stats.onlineCount },
                        { name: "Offline", value: stats.offlineCount },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell key="cell-0" fill="#3b82f6" /> {/* Blue-500 */}
                      <Cell key="cell-1" fill="#6366f1" /> {/* Indigo-500 */}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subscription Distribution Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Tipe Langganan</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subscriptionStats}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        width={80}
                    />
                    <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {subscriptionStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4 items-start mb-8">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600 shrink-0">
                <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
                <h4 className="font-bold text-blue-900 text-sm">Logika Perhitungan</h4>
                <p className="text-blue-700/80 text-xs leading-relaxed">
                    Durasi dihitung berdasarkan tipe langganan (Nilai: 1-3 jam). 
                    <br/>
                    Jadwal <strong>Offline</strong> mencakup tambahan waktu perjalanan <strong>30 menit</strong>.
                    Hanya jadwal dengan status <strong>"Fix Schedule"</strong> yang disertakan dalam laporan ini.
                </p>
            </div>
        </div>

        {/* Schedule List Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Daftar Jadwal Fix Schedule</h3>
            <p className="text-slate-500 text-sm">Detail lengkap aktivitas yang telah dijadwalkan.</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] py-4 pl-6 font-semibold text-slate-600 text-xs uppercase tracking-wider">No</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Nama Outlet</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Schedule</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Invoice</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Tanggal</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Tipe</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Paket</TableHead>
                  <TableHead className="py-4 pr-6 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Durasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      Tidak ada data jadwal.
                    </TableCell>
                  </TableRow>
                ) : (
                  data
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((item, index) => {
                    const durationMs = calculateDurationInMs(item);
                    const durationHours = durationMs / (1000 * 60 * 60);
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    
                    return (
                      <TableRow key={item.id} className="border-b border-slate-50 group hover:bg-blue-50/30 transition-colors">
                        <TableCell className="pl-6 py-4 font-medium text-slate-500 text-xs">{rowNumber}</TableCell>
                        <TableCell className="py-4 font-semibold text-slate-800 text-sm">{item.nama_outlet}</TableCell>
                        <TableCell className="py-4 text-slate-600">
                          {item.sch_leads ? (
                              <a 
                                  href={formatSchLeadsToUrl(item.sch_leads) || "#"}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors border border-blue-100"
                              >
                                  <Link2 className="h-3 w-3" />
                                  {item.sch_leads.replace("SCH/LEADS/", "")}
                              </a>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                            {item.no_invoice ? (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                    {item.no_invoice}
                                </span>
                            ) : (
                                <span className="text-slate-400 text-xs">-</span>
                            )}
                        </TableCell>
                        <TableCell className="py-4 text-slate-600 text-sm font-medium">
                          {item.tanggal_instalasi ? format(new Date(item.tanggal_instalasi), "dd MMMM yyyy", { locale: id }) : "-"}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            item.tipe_outlet === 'Online' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {item.tipe_outlet || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                             <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
                                {item.tipe_langganan || "-"}
                            </span>
                        </TableCell>
                        <TableCell className="py-4 pr-6 text-right font-bold text-slate-700 text-sm">
                          {durationHours} Jam
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {!loading && data.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
              <div className="text-sm text-slate-500">
                Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-medium">{Math.min(currentPage * itemsPerPage, data.length)}</span> dari <span className="font-medium">{data.length}</span> data
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 rounded-lg border-slate-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-slate-700">
                  Halaman {currentPage}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => (prev * itemsPerPage < data.length ? prev + 1 : prev))}
                  disabled={currentPage * itemsPerPage >= data.length}
                  className="h-8 w-8 p-0 rounded-lg border-slate-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
