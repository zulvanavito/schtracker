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
  Activity as ActivityIcon,
  Calendar,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Link2,
  BarChart3,
  PieChart as PieChartIcon,
  History,
  Activity,
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
    <div className="min-h-screen bg-background p-6 md:p-12 font-sans selection:bg-notion-sky selection:text-primary">
      <div className="max-w-6xl mx-auto">
        <Header
          title="Activity Summary"
          subtitle="Analysis of hours and performance for fixed schedules."
          icon={<Activity className="h-8 w-8" />}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            className="rounded-md border-input hover:bg-secondary text-muted-foreground hover:text-primary h-11 w-11"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-md h-11 px-5 border-input text-foreground font-medium hover:text-primary hover:bg-secondary"
          >
            <Link href="/tabel">
              <FileText className="h-4 w-4 mr-2" />
              Data Table
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-md h-11 px-5 border-input text-foreground font-medium hover:text-primary hover:bg-secondary"
          >
            <Link href="/jadwal">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-md h-11 px-5 border-input text-foreground font-medium hover:text-primary hover:bg-secondary"
          >
            <Link href="/todo">
              <FileText className="h-4 w-4 mr-2" />
              To-Do List
            </Link>
          </Button>
          <Button
            asChild
            className="gap-2 h-11 px-5 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm transition-all"
          >
            <Link href="/">
              <Sparkles className="h-4 w-4" />
              New Schedule
            </Link>
          </Button>
        </Header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
           {/* Total Card */}
           <Card className="border-0 shadow-notion-elevation-3 bg-notion-navy text-white rounded-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock className="w-32 h-32" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-on-dark-muted font-bold text-[11px] uppercase tracking-[0.2em]">Total Productivity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold tracking-tight">
                    {loading ? "..." : stats.totalHours}
                  </span>
                  <span className="text-xl font-medium text-on-dark-muted">Hours</span>
                </div>
                <p className="text-on-dark-muted mt-4 text-sm font-normal">
                  From {loading ? "..." : stats.onlineCount + stats.offlineCount} scheduled activities
                </p>
              </CardContent>
           </Card>

           {/* Online Card */}
           <Card className="border-border bg-white shadow-none rounded-xl hover:shadow-notion-2 transition-all duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                   <div className="p-2 bg-notion-mint rounded-lg text-brand-green">
                      <MonitorPlay className="h-4 w-4" />
                   </div>
                   Online Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {loading ? "..." : stats.onlineHours}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Hours</span>
                </div>
                <div className="mt-4 pt-4 border-t border-hairline flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Activities</span>
                    <span className="text-lg font-bold text-foreground">{stats.onlineCount}</span>
                </div>
              </CardContent>
           </Card>

           {/* Offline Card */}
           <Card className="border-border bg-white shadow-none rounded-xl hover:shadow-notion-2 transition-all duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                   <div className="p-2 bg-notion-peach rounded-lg text-brand-orange">
                      <Map className="h-4 w-4" />
                   </div>
                   Offline Visits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {loading ? "..." : stats.offlineHours}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Hours</span>
                </div>
                <div className="mt-4 pt-4 border-t border-hairline flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Activities</span>
                    <span className="text-lg font-bold text-foreground">{stats.offlineCount}</span>
                </div>
              </CardContent>
           </Card>
        </div>

        {/* Charts Section */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Outlet Distribution Chart */}
            <div className="bg-white p-8 rounded-xl shadow-none border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                  Outlet Distribution
              </h3>
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
                      paddingAngle={8}
                      dataKey="value"
                    >
                      <Cell key="cell-0" fill="#2a9d99" /> {/* Brand Teal */}
                      <Cell key="cell-1" fill="#dd5b00" /> {/* Brand Orange */}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid #e5e3df', 
                            boxShadow: 'rgba(15, 15, 15, 0.1) 0px 4px 12px 0px' 
                        }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subscription Distribution Chart */}
            <div className="bg-white p-8 rounded-xl shadow-none border border-border">
               <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                  Subscription Types
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subscriptionStats}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e3df" />
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#5d5b54' }} 
                        width={100}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip 
                        cursor={{ fill: '#f6f5f4' }}
                        contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid #e5e3df', 
                            boxShadow: 'rgba(15, 15, 15, 0.1) 0px 4px 12px 0px' 
                        }}
                    />
                    <Bar dataKey="value" fill="#5645d4" radius={[0, 4, 4, 0]} barSize={24}>
                        {subscriptionStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#5645d4' : '#7b3ff2'} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <div className="bg-notion-sky border border-link-blue/20 rounded-xl p-5 flex gap-4 items-start mb-10">
            <div className="p-2 bg-white rounded-lg text-link-blue shadow-sm border border-link-blue/10 shrink-0">
                <Info className="h-4 w-4" />
            </div>
            <div className="space-y-1">
                <h4 className="font-bold text-link-blue text-sm uppercase tracking-wide">Calculation Logic</h4>
                <p className="text-slate-600 text-xs leading-relaxed font-normal">
                    Duration is estimated based on subscription tier (approx. 1-3 hours). 
                    <br/>
                    <strong>Offline</strong> schedules include a <strong>30-minute</strong> travel buffer.
                    Only activities with <strong>"Fix Schedule"</strong> status are included in this report.
                </p>
            </div>
        </div>

        {/* Schedule List Table */}
        <div className="bg-white rounded-xl shadow-none border border-border overflow-hidden mb-12">
          <div className="p-6 border-b border-hairline bg-secondary/20">
            <h3 className="text-lg font-semibold text-foreground">Fixed Schedule Records</h3>
            <p className="text-muted-foreground text-sm font-normal">Complete list of verified installation sessions.</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/10 border-b border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] py-4 pl-6 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">No</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Outlet Name</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Leads ID</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Invoice</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Date</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Type</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Package</TableHead>
                  <TableHead className="py-4 pr-6 text-right font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground font-normal">
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground font-normal">
                      No fixed schedule records found.
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
                      <TableRow key={item.id} className="border-b border-hairline-soft group hover:bg-secondary/20 transition-colors">
                        <TableCell className="pl-6 py-4 font-bold text-stone text-[10px]">{rowNumber}</TableCell>
                        <TableCell className="py-4 font-bold text-foreground text-sm">{item.nama_outlet}</TableCell>
                        <TableCell className="py-4">
                          {item.sch_leads ? (
                              <a 
                                  href={formatSchLeadsToUrl(item.sch_leads) || "#"}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-link-blue bg-notion-sky px-2 py-1 rounded border border-notion-sky hover:bg-notion-sky/70 transition-colors"
                              >
                                  <Link2 className="h-3 w-3" />
                                  {item.sch_leads.replace("SCH/LEADS/", "")}
                              </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                            {item.no_invoice ? (
                                <span className="text-[10px] font-bold text-muted-foreground bg-notion-gray px-2 py-1 rounded border border-border uppercase">
                                    {item.no_invoice}
                                </span>
                            ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                            )}
                        </TableCell>
                        <TableCell className="py-4 text-foreground text-sm font-semibold">
                          {item.tanggal_instalasi ? format(new Date(item.tanggal_instalasi), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                            item.tipe_outlet === 'Online' 
                              ? 'bg-notion-mint text-brand-green border-notion-mint' 
                              : 'bg-notion-peach text-brand-orange-deep border-notion-peach'
                          }`}>
                            {item.tipe_outlet || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                             <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-notion-sky text-link-blue border border-notion-sky">
                                {item.tipe_langganan || "-"}
                            </span>
                        </TableCell>
                        <TableCell className="py-4 pr-6 text-right font-bold text-foreground text-sm">
                          {durationHours} Hours
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
            <div className="flex items-center justify-between p-4 border-t border-hairline bg-secondary/10">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, data.length)}</span> of <span className="text-foreground">{data.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 rounded-md border-input"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-[11px] font-bold text-foreground mx-2 uppercase tracking-tight">
                  Page {currentPage} of {Math.ceil(data.length / itemsPerPage)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => (prev * itemsPerPage < data.length ? prev + 1 : prev))}
                  disabled={currentPage * itemsPerPage >= data.length}
                  className="h-8 w-8 p-0 rounded-md border-input"
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
