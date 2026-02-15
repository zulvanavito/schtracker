/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { calculateDurationInMs } from "@/lib/utils";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Event as BigCalendarEvent, View } from "react-big-calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import AuthButton from "@/components/AuthButton";
import {
  Calendar as CalendarIcon,
  FileText,
  Sparkles,
  Building,
  User,
  Phone,
  MapPin,
  Clock,
  Link2,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  Map,
} from "lucide-react";
import Header from "@/components/Header";

// --- Interfaces ---
interface LogPesan {
  id: number;
  created_at: string;
  tipe_pesan: string;
}
interface Jadwal {
  id: number;
  tanggal_instalasi: string;
  pukul_instalasi: string;
  nama_outlet: string;
  sch_leads: string;
  tipe_outlet: string;
  tipe_langganan: string;
  nama_owner: string;
  no_telepon: string;
  no_invoice: string;
  alamat: string;
  hari_instalasi: string;
  link_meet: string;
  log_pesan: LogPesan[];
  google_event_id?: string;
}
interface EditFormData {
  id?: number;
  nama_outlet?: string;
  nama_owner?: string;
  no_telepon?: string;
  no_invoice?: string;
  sch_leads?: string;
  alamat?: string;
  tipe_outlet?: string;
  tipe_langganan?: string;
  hari_instalasi?: string;
  tanggal_instalasi?: Date | undefined;
  pukul_instalasi?: string;
  link_meet?: string;
  google_event_id?: string;
}

interface DeleteRequestBody {
  id: number;
  google_access_token?: string;
}

interface UpdateRequestBody {
  id?: number;
  nama_outlet?: string;
  nama_owner?: string;
  no_telepon?: string;
  no_invoice?: string;
  sch_leads?: string;
  alamat?: string;
  tipe_outlet?: string;
  tipe_langganan?: string;
  hari_instalasi?: string;
  tanggal_instalasi?: string;
  pukul_instalasi?: string;
  link_meet?: string;
  google_event_id?: string;
  google_access_token?: string;
}

// --- Constants & Helpers ---
const hours = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const minutes = ["00", "15", "30", "45"];

const localizer = momentLocalizer(moment);

const eventPropGetter = (event: BigCalendarEvent) => {
  const resource = event.resource as Jadwal;
  let className = "event-default";
  
  if (resource.tipe_langganan) {
    const type = resource.tipe_langganan.toLowerCase();
    if (type.includes("starter basic")) {
      className = "event-starter-basic";
    } else if (type.includes("starter")) {
      className = "event-starter";
    } else if (type.includes("advance")) {
      className = "event-advance";
    } else if (type.includes("prime")) {
      className = "event-prime";
    } else if (type.includes("training")) {
      className = "event-training";
    }
  }

  return { className };
};

// --- Custom Toolbar Component ---
const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate("PREV");
  };

  const goToNext = () => {
    toolbar.onNavigate("NEXT");
  };

  const goToCurrent = () => {
    toolbar.onNavigate("TODAY");
  };

  const label = () => {
    const date = moment(toolbar.date);
    return (
      <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        {date.format("MMMM YYYY")}
      </span>
    );
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      {/* Navigation */}
      <div className="flex items-center gap-1 bg-white/70 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-white/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToBack}
          className="rounded-xl hover:bg-blue-50 text-slate-600 w-8 h-8"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          onClick={goToCurrent}
          className="font-semibold text-slate-700 px-3 h-8 rounded-xl hover:bg-blue-50 text-sm"
        >
          Hari Ini
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className="rounded-xl hover:bg-blue-50 text-slate-600 w-8 h-8"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Label */}
      <div className="flex-1 text-center">{label()}</div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 bg-white/70 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-white/50">
        {["month", "week", "day"].map((view) => (
          <button
            key={view}
            onClick={() => toolbar.onView(view)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              toolbar.view === view
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold"
                : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            {view === "month" ? "Bulan" : view === "week" ? "Minggu" : "Hari"}
          </button>
        ))}
      </div>
    </div>
  );
};


export default function HalamanJadwal() {
  const [events, setEvents] = useState<BigCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Jadwal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchJadwal() {
    setLoading(true);
    try {
      const response = await fetch("/api/get-jadwal", {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Gagal mengambil data jadwal");

      const result = await response.json();
      const dataJadwal: Jadwal[] = result.data || [];

      const formattedEvents = dataJadwal.map((item) => {
        const startDate = new Date(
          `${item.tanggal_instalasi}T${item.pukul_instalasi}`
        );
        const durationMs = calculateDurationInMs(item);
        const endDate = new Date(startDate.getTime() + durationMs);
        return {
          title: `${item.nama_outlet} - ${item.tipe_langganan}`,
          start: startDate,
          end: endDate,
          resource: item, // Simpan data asli di resource
        };
      });

      setEvents(formattedEvents);
    } catch (err: unknown) {
      console.error("Error fetching:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJadwal();
  }, []);

  const onNavigate = useCallback(
    (newDate: Date) => setDate(newDate),
    [setDate]
  );
  const onView = useCallback((newView: View) => setView(newView), [setView]);

  const openModal = (eventResource: Jadwal) => {
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
    setSelectedEvent(eventResource);
    const dateParts = eventResource.tanggal_instalasi.split("-").map(Number);
    const safeDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    setEditFormData({
      ...eventResource,
      tanggal_instalasi: safeDate,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setEditFormData(null);
  };

  // --- Handlers (Delete, Update) ---
  const handleDelete = async () => {
    if (!selectedEvent) return;

    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) throw sessionError;
          if (!session) throw new Error("Anda tidak terautentikasi.");

          const requestBody: DeleteRequestBody = {
            id: selectedEvent.id,
          };

          if (session.provider_token) {
            requestBody.google_access_token = session.provider_token;
          }

          const response = await fetch("/api/hapus-jadwal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Gagal menghapus");
          }

          fetchJadwal();
          closeModal();

          const successMessage = session.provider_token
            ? "Jadwal berhasil dihapus (dari Supabase & Google Calendar)!"
            : "Jadwal berhasil dihapus dari database!";

          resolve(successMessage);
        } catch (err) {
          reject(err);
        }
      });

    toast.promise(promise, {
      loading: "Menghapus jadwal...",
      success: (msg) => msg as string,
      error: (err: Error) => `Error: ${err.message}`,
    });
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editFormData?.tanggal_instalasi) {
      toast.error("Validasi Gagal", {
        description: "Tanggal Instalasi wajib diisi.",
      });
      return;
    }
    if (
      !editFormData?.pukul_instalasi ||
      editFormData.pukul_instalasi.split(":").length < 2
    ) {
      toast.error("Validasi Gagal", {
        description: "Pukul Instalasi (Jam dan Menit) wajib diisi.",
      });
      return;
    }

    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) throw sessionError;
          if (!session) throw new Error("Anda tidak terautentikasi.");

          const validFields = [
            "id",
            "nama_outlet",
            "nama_owner",
            "no_telepon",
            "no_invoice",
            "sch_leads",
            "alamat",
            "tipe_outlet",
            "tipe_langganan",
            "hari_instalasi",
            "tanggal_instalasi",
            "pukul_instalasi",
            "link_meet",
            "google_event_id",
          ];

          const filteredData: Partial<UpdateRequestBody> = {};
          validFields.forEach((field) => {
            const value = editFormData[field as keyof EditFormData];
            if (value !== undefined) {
              if (field === "tanggal_instalasi") {
                // Skip
              } else {
                filteredData[field as keyof UpdateRequestBody] = value as any;
              }
            }
          });

          // Handle tanggal_instalasi
          if (editFormData.tanggal_instalasi) {
            filteredData.tanggal_instalasi = format(
              editFormData.tanggal_instalasi,
              "yyyy-MM-dd"
            );
          }

          const requestBody: UpdateRequestBody = {
            ...filteredData,
          } as UpdateRequestBody;

          if (session.provider_token) {
            requestBody.google_access_token = session.provider_token;
          }

          const response = await fetch("/api/ubah-jadwal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Gagal memperbarui");
          }

          fetchJadwal();
          closeModal();
          resolve("Jadwal berhasil diperbarui!");
        } catch (err) {
          reject(err);
        }
      });

    toast.promise(promise, {
      loading: "Menyimpan perubahan...",
      success: (msg) => msg as string,
      error: (err: Error) => `Error: ${err.message}`,
    });
  };

  // --- Form helpers ---
  const handleEditInputChange = (name: string, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "tipe_outlet" && value === "Offline" && { link_meet: "" }),
    }));
  };

  const handleEditSelectChange = (name: string, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "tipe_outlet" && value === "Offline" && { link_meet: "" }),
    }));
  };

  const handleEditDateChange = (date: Date | undefined) => {
    let hari = "";
    if (date) {
      hari = date.toLocaleDateString("id-ID", { weekday: "long" });
    }
    setEditFormData((prev) => ({
      ...prev,
      tanggal_instalasi: date,
      hari_instalasi: hari,
    }));
  };

  const handleEditTimeChange = (part: "hour" | "minute", value: string) => {
    if (!editFormData) return;
    const [currentHour = "09", currentMinute = "00"] = (
      editFormData.pukul_instalasi || "09:00"
    ).split(":");
    let newTime: string;
    if (part === "hour") {
      newTime = `${value}:${currentMinute}`;
    } else {
      newTime = `${currentHour}:${value}`;
    }
    setEditFormData((prev) => ({ ...prev, pukul_instalasi: newTime }));
  };

  const [editHour = "", editMinute = ""] = (
    editFormData?.pukul_instalasi || ""
  ).split(":");

  const formatTanggalDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-blue-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 glass-card border-l-4 border-l-red-500 flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-700">
              <X className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                fetchJadwal();
              }}
              className="text-red-700 hover:bg-red-50 border-red-200"
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Header Section */}
        <Header
          title="Schedule Hub"
          subtitle="Manage installation schedules effortlessly"
          icon={<CalendarIcon className="h-8 w-8" />}
        >
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50"
          >
            <Link href="/tabel">
              <FileText className="h-4 w-4" />
              Data Table
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50"
          >
            <Link href="/activity">
              <MonitorPlay className="h-4 w-4" />
              Activity
            </Link>
          </Button>
          <Button
            asChild
            className="gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-300 font-semibold"
          >
            <Link href="/">
              <Sparkles className="h-4 w-4" />
              New Schedule
            </Link>
          </Button>
        </Header>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            icon={<CalendarIcon className="h-6 w-6 text-indigo-600" />}
            label="Total Schedules"
            value={events.length}
            color="bg-indigo-50"
            ring="ring-indigo-100"
          />
          <StatCard
            icon={<MonitorPlay className="h-6 w-6 text-emerald-600" />}
            label="Online Sessions"
            value={
              events.filter(
                (e) => (e.resource as Jadwal)?.tipe_outlet === "Online"
              ).length
            }
            color="bg-emerald-50"
            ring="ring-emerald-100"
          />
          <StatCard
            icon={<Map className="h-6 w-6 text-amber-600" />}
            label="Offline Visits"
            value={
              events.filter(
                (e) => (e.resource as Jadwal)?.tipe_outlet === "Offline"
              ).length
            }
            color="bg-amber-50"
            ring="ring-amber-100"
          />
        </div>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap items-center gap-6 px-4 py-3 bg-white/40 backdrop-blur-sm rounded-xl border border-white/40 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Legend:</span>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                <span className="text-xs font-semibold text-slate-600">Starter</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                <span className="text-xs font-semibold text-slate-600">Starter Basic</span>
            </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-xs font-semibold text-slate-600">Advance</span>
            </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs font-semibold text-slate-600">Prime</span>
            </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-semibold text-slate-600">Training</span>
            </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6 items-center bg-white/40 backdrop-blur-sm p-3 rounded-2xl w-fit border border-white/40">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">Legend:</span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100/50 text-emerald-700 text-xs font-semibold border border-emerald-200/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Online
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100/50 text-amber-700 text-xs font-semibold border border-amber-200/50">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div> Offline
            </span>
        </div>

        {/* Calendar Container */}
        <div className="glass-card p-6 md:p-8 min-h-[800px] mb-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[600px] space-y-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-100 animate-pulse"></div>
                <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-slate-500 font-medium animate-pulse">
                Synchronizing calendar data...
              </p>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={["month", "week", "day"]}
              components={{
                toolbar: CustomToolbar,
              }}
              onSelectEvent={(event) => openModal(event.resource as Jadwal)}
              date={date}
              view={view}
              onNavigate={onNavigate}
              onView={onView}
              eventPropGetter={eventPropGetter}
              className="min-h-[700px]"
              popup
            />
          )}
        </div>
      </div>

      {/* Modal Detail & Edit */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] rounded-3xl border-0 shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl ring-1 ring-black/5">
          {selectedEvent && (
            <>
              {isEditing ? (
                // MODE EDIT
                <form
                  onSubmit={handleUpdateSubmit}
                  className="flex flex-col max-h-[90vh]"
                >
                  <DialogHeader className="p-6 pb-4 border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <Edit className="h-5 w-5 text-blue-600" />
                      </div>
                      Edit Schedule
                    </DialogTitle>
                  </DialogHeader>

                  <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-5">
                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Details</h4>
                            <FormInput
                                label="Nama Outlet"
                                name="nama_outlet"
                                value={editFormData?.nama_outlet}
                                onChange={handleEditInputChange}
                                icon={<Building className="h-4 w-4" />}
                            />
                             <FormInput
                                label="Nama Owner"
                                name="nama_owner"
                                value={editFormData?.nama_owner}
                                onChange={handleEditInputChange}
                                icon={<User className="h-4 w-4" />}
                            />
                             <FormInput
                                label="No Telepon"
                                name="no_telepon"
                                value={editFormData?.no_telepon}
                                onChange={handleEditInputChange}
                                icon={<Phone className="h-4 w-4" />}
                            />
                        </div>
                        <div className="space-y-5">
                             <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Classification</h4>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Link2 className="h-4 w-4 text-blue-500" /> Tipe Outlet
                                </Label>
                                <Select
                                    name="tipe_outlet"
                                    value={editFormData?.tipe_outlet}
                                    onValueChange={(v) => handleEditSelectChange("tipe_outlet", v)}
                                >
                                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Online">Online</SelectItem>
                                        <SelectItem value="Offline">Offline</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <FormInput
                                label="Tipe Langganan"
                                name="tipe_langganan"
                                value={editFormData?.tipe_langganan}
                                onChange={handleEditInputChange}
                            />
                             <FormInput
                                label="SCH Leads"
                                name="sch_leads"
                                value={editFormData?.sch_leads}
                                onChange={handleEditInputChange}
                            />
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Timing</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                                label="Hari Instalasi"
                                name="hari_instalasi"
                                value={editFormData?.hari_instalasi}
                                onChange={handleEditInputChange}
                                required
                            />
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <CalendarIcon className="h-4 w-4 text-emerald-500" /> Tanggal
                                </Label>
                                <DatePicker
                                    date={editFormData?.tanggal_instalasi}
                                    onSelect={handleEditDateChange}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Clock className="h-4 w-4 text-purple-500" /> Waktu
                                </Label>
                                <div className="flex gap-2">
                                <Select
                                    value={editHour}
                                    onValueChange={(value) =>
                                    handleEditTimeChange("hour", value)
                                    }
                                    required
                                >
                                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                                    <SelectValue placeholder="Jam" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                    {hours.map((hour) => (
                                        <SelectItem key={hour} value={hour}>
                                        {hour}.00
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={editMinute}
                                    onValueChange={(value) =>
                                    handleEditTimeChange("minute", value)
                                    }
                                    required
                                >
                                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                                    <SelectValue placeholder="Menit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {minutes.map((minute) => (
                                        <SelectItem key={minute} value={minute}>
                                        .{minute}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <FormInput
                        label="Alamat Lengkap"
                        name="alamat"
                        value={editFormData?.alamat}
                        onChange={handleEditInputChange}
                        icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>

                  <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="rounded-xl hover:bg-slate-200/50 text-slate-600"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-6"
                    >
                      Simpan Perubahan
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                // MODE VIEW
                <>
                  <DialogHeader className="p-0">
                    <div className={`h-24 w-full bg-gradient-to-r ${selectedEvent.tipe_outlet === "Online" ? "from-emerald-500 to-teal-500" : "from-amber-500 to-orange-500"} relative`}>
                        <div className="absolute -bottom-10 left-6 p-4 bg-white rounded-2xl shadow-xl ring-4 ring-white">
                             {selectedEvent.tipe_outlet === "Online" ? (
                                <MonitorPlay className="h-8 w-8 text-emerald-600" />
                             ) : (
                                <Building className="h-8 w-8 text-amber-600" />
                             )}
                        </div>
                    </div>
                    <div className="mt-12 px-6">
                        <DialogTitle className="text-2xl font-bold text-slate-800">
                          {selectedEvent.nama_outlet}
                        </DialogTitle>
                        <p className="text-slate-500 font-medium">{selectedEvent.sch_leads}</p>
                    </div>
                  </DialogHeader>

                  <div className="px-6 py-6 space-y-8 overflow-y-auto max-h-[60vh]">
                    {/* Status Chips */}
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedEvent.tipe_outlet === "Online" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {selectedEvent.tipe_outlet}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                            {selectedEvent.tipe_langganan}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                         <InfoItem
                          icon={<User className="h-4 w-4 text-slate-400" />}
                          label="Owner"
                          value={selectedEvent.nama_owner}
                        />
                         <InfoItem
                          icon={<Phone className="h-4 w-4 text-slate-400" />}
                          label="Contact"
                          value={selectedEvent.no_telepon}
                        />
                         <InfoItem
                          icon={<CalendarIcon className="h-4 w-4 text-slate-400" />}
                          label="Date"
                          value={formatTanggalDisplay(selectedEvent.tanggal_instalasi)}
                        />
                         <InfoItem
                          icon={<Clock className="h-4 w-4 text-slate-400" />}
                          label="Time"
                          value={`${selectedEvent.pukul_instalasi} WIB`}
                        />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</p>
                                <p className="text-slate-700 leading-relaxed font-medium">{selectedEvent.alamat}</p>
                            </div>
                        </div>
                         {selectedEvent.link_meet && (
                            <div className="flex items-start gap-3 pt-3 border-t border-slate-200">
                                <Link2 className="h-5 w-5 text-blue-500 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meet Link</p>
                                    <a href={selectedEvent.link_meet} target="_blank" className="text-blue-600 hover:underline font-medium break-all">
                                        {selectedEvent.link_meet}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Log Pesan */}
                    <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            <MessageSquare className="h-4 w-4 text-blue-500" /> Message History
                        </h4>
                        {selectedEvent.log_pesan && selectedEvent.log_pesan.length > 0 ? (
                             <div className="space-y-2">
                                {selectedEvent.log_pesan.map((log) => (
                                    <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                                        <span className="text-sm font-medium text-blue-900">{log.tipe_pesan}</span>
                                        <span className="text-xs text-blue-400">{new Date(log.created_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No messages sent yet.</p>
                        )}
                    </div>
                  </div>

                  <DialogFooter className="p-6 pt-2 gap-3 justify-between items-center border-t border-slate-100">
                     <Button
                      variant="ghost"
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                    <div className="flex gap-3">
                        <Button
                        variant="outline"
                        onClick={closeModal}
                        className="rounded-xl border-slate-200 text-slate-600"
                        >
                        Close
                        </Button>
                        <Button
                        onClick={() => setIsEditing(true)}
                        className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                        >
                        <Edit className="h-4 w-4 mr-2" /> Edit Info
                        </Button>
                    </div>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Components Helpers ---

function StatCard({ icon, label, value, color, ring }: any) {
  return (
    <div className="glass-card p-5 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
      <div className={`p-3 rounded-2xl ${color} ${ring} ring-1`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-extrabold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, isLink }: any) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
        {icon} {label}
      </p>
      <p className="text-base font-semibold text-slate-800 truncate">{value || "-"}</p>
    </div>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  icon,
}: any) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={name}
        className="flex items-center gap-2 text-sm font-medium text-slate-700"
      >
        {icon}
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        value={value || ""}
        onChange={(e) => onChange(e.target.name, e.target.value)}
        type={type}
        required={required}
        disabled={disabled}
        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all duration-300"
      />
    </div>
  );
}
