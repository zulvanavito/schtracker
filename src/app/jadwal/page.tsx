/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

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

const hours = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const minutes = ["00", "15", "30", "45"];

const localizer = momentLocalizer(moment);


function calculateDurationInMs(item: Jadwal | EditFormData) {
  let durationHours = 0;
  const langganan = item.tipe_langganan
    ? item.tipe_langganan.toLowerCase()
    : "";
  const tipe = item.tipe_outlet ? item.tipe_outlet.toLowerCase() : "";
  switch (langganan) {
    case "starter basic":
      durationHours = 1;
      break;
    case "starter":
      durationHours = 2;
      break;
    case "advance":
    case "prime":
    case "training berbayar":
      durationHours = 3;
      break;
    default:
      durationHours = 2;
  }
  let durationMs = durationHours * 60 * 60 * 1000;
  if (tipe === "offline") {
    durationMs += 30 * 60 * 1000;
  }
  return durationMs;
}

const eventPropGetter = (event: BigCalendarEvent) => {
  const resource = event.resource as Jadwal;
  let className = "";

  if (resource.tipe_outlet === "Online") {
    className = "event-online";
  } else if (resource.tipe_outlet === "Offline") {
    className = "event-offline";
  }

  return { className };
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
      console.log("📋 Response from API:", result); // Debug log

      // PERBAIKAN: Ambil data dari result.data, bukan result langsung
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
          resource: item,
        };
      });

      setEvents(formattedEvents);
      console.log(`✅ Formatted ${formattedEvents.length} events`);
    } catch (err: unknown) {
      console.error("❌ Error in fetchJadwal:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      if (err instanceof Error) {
        toast.error("Gagal mengambil data", { description: err.message });
      } else {
        toast.error("Gagal mengambil data");
      }
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

          const requestBody: any = {
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
            : "Jadwal berhasil dihapus dari database! (Event Google mungkin masih ada)";

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
    setEditFormData((prev) => ({
      ...prev,
      tanggal_instalasi: date,
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

          const filteredData: any = {};
          validFields.forEach((field) => {
            if (editFormData[field as keyof EditFormData] !== undefined) {
              filteredData[field] = editFormData[field as keyof EditFormData];
            }
          });

          filteredData.tanggal_instalasi = format(
            editFormData.tanggal_instalasi,
            "yyyy-MM-dd"
          );

          const requestBody: any = { ...filteredData };

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

  const [editHour = "", editMinute = ""] = (
    editFormData?.pukul_instalasi || ""
  ).split(":");

  // Format tanggal untuk display
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-2 text-red-800">
              <X className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                fetchJadwal();
              }}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
            >
              Coba Lagi
            </button>
          </div>
        )}
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Kalender Jadwal
                </h1>
                <p className="text-muted-foreground text-lg">
                  Visualisasi jadwal instalasi dalam tampilan kalender yang
                  interaktif
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/tabel">
                <FileText className="h-4 w-4" />
                Daftar Tabel
              </Link>
            </Button>
            <Button
              asChild
              className="gap-2 bg-linear-to-r from-blue-600 to-indigo-600"
            >
              <Link href="/">
                <Sparkles className="h-4 w-4" />
                Tambah Jadwal
              </Link>
            </Button>
            <AuthButton />
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Jadwal</p>
                <p className="text-2xl font-bold text-slate-800">
                  {events.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-slate-800">
                  {
                    events.filter(
                      (e) => (e.resource as Jadwal)?.tipe_outlet === "Online"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold text-slate-800">
                  {
                    events.filter(
                      (e) => (e.resource as Jadwal)?.tipe_outlet === "Offline"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Container */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-0 overflow-hidden mb-8">
          <div className="p-6 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                Kalender Jadwal Instalasi
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Durasi otomatis berdasarkan Tipe Langganan & Outlet
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="h-[70vh] rounded-xl overflow-hidden border">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-muted-foreground">Memuat kalender...</p>
                  </div>
                </div>
              ) : (
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  views={["month", "week", "day"]}
                  onSelectEvent={(event) => openModal(event.resource as Jadwal)}
                  date={date}
                  view={view}
                  onNavigate={onNavigate}
                  onView={onView}
                  eventPropGetter={eventPropGetter}
                  className="rounded-lg"
                  popup
                />
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Kode Warna Jadwal
          </h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Starter Basic (1 jam)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm">Starter (2 jam)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Advance/Prime (3 jam)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detail & Edit */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl rounded-2xl border-0 shadow-2xl max-h-[90vh] overflow-hidden">
          {selectedEvent && (
            <>
              {isEditing ? (
                // MODE EDIT
                <form onSubmit={handleUpdateSubmit}>
                  <DialogHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b p-6 rounded-t-2xl">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <Edit className="h-5 w-5 text-blue-600" />
                      Ubah Jadwal
                    </DialogTitle>
                  </DialogHeader>

                  <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormInput
                          label="Nama Outlet"
                          name="nama_outlet"
                          value={editFormData?.nama_outlet}
                          onChange={handleEditInputChange}
                          icon={<Building className="h-4 w-4" />}
                        />
                        <FormInput
                          label="No Telepon"
                          name="no_telepon"
                          value={editFormData?.no_telepon}
                          onChange={handleEditInputChange}
                          icon={<Phone className="h-4 w-4" />}
                        />
                        <FormInput
                          label="Alamat"
                          name="alamat"
                          value={editFormData?.alamat}
                          onChange={handleEditInputChange}
                          icon={<MapPin className="h-4 w-4" />}
                        />
                        <FormInput
                          label="SCH Leads"
                          name="sch_leads"
                          value={editFormData?.sch_leads}
                          onChange={handleEditInputChange}
                        />
                      </div>
                      <div className="space-y-4">
                        <FormInput
                          label="Nama Owner"
                          name="nama_owner"
                          value={editFormData?.nama_owner}
                          onChange={handleEditInputChange}
                          icon={<User className="h-4 w-4" />}
                        />
                        <FormInput
                          label="No Invoice"
                          name="no_invoice"
                          value={editFormData?.no_invoice}
                          onChange={handleEditInputChange}
                          icon={<FileText className="h-4 w-4" />}
                        />
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Link2 className="h-4 w-4 text-blue-500" />
                            Tipe Outlet
                          </Label>
                          <Select
                            name="tipe_outlet"
                            value={editFormData?.tipe_outlet}
                            onValueChange={(v) =>
                              handleEditSelectChange("tipe_outlet", v)
                            }
                          >
                            <SelectTrigger className="rounded-xl">
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
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div className="md:col-span-3">
                        <FormInput
                          label="Hari Instalasi"
                          name="hari_instalasi"
                          value={editFormData?.hari_instalasi}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <CalendarIcon className="h-4 w-4 text-green-500" />
                          Tanggal Instalasi
                        </Label>
                        <DatePicker
                          date={editFormData?.tanggal_instalasi}
                          onSelect={handleEditDateChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4 text-purple-500" />
                          Waktu Instalasi
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={editHour}
                            onValueChange={(value) =>
                              handleEditTimeChange("hour", value)
                            }
                            required
                          >
                            <SelectTrigger className="rounded-xl">
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
                            <SelectTrigger className="rounded-xl">
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
                      <div className="md:col-span-3">
                        <FormInput
                          label={
                            editFormData?.tipe_outlet === "Online"
                              ? "Link Google Meet (Akan dibuat otomatis)"
                              : "Link Meet (Tidak diperlukan untuk offline)"
                          }
                          name="link_meet"
                          value={editFormData?.link_meet}
                          onChange={handleEditInputChange}
                          disabled={true}
                          icon={<Link2 className="h-4 w-4" />}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="bg-slate-50/50 border-t p-6 rounded-b-2xl gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="gap-2 rounded-xl"
                    >
                      <X className="h-4 w-4" />
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      className="gap-2 rounded-xl bg-linear-to-r from-green-600 to-emerald-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Simpan Perubahan
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                // MODE VIEW
                <>
                  <DialogHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b p-6 rounded-t-2xl">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                      Detail Jadwal
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedEvent.tipe_outlet === "Online"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {selectedEvent.tipe_outlet}
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {selectedEvent.sch_leads}
                      </span>
                    </div>
                  </DialogHeader>

                  <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Informasi Utama */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <InfoItem
                          icon={<Building className="h-4 w-4 text-blue-600" />}
                          label="Outlet"
                          value={selectedEvent.nama_outlet}
                        />
                        <InfoItem
                          icon={<User className="h-4 w-4 text-green-600" />}
                          label="Owner"
                          value={selectedEvent.nama_owner}
                        />
                        <InfoItem
                          icon={<Phone className="h-4 w-4 text-purple-600" />}
                          label="No. Telepon"
                          value={selectedEvent.no_telepon}
                        />
                        <InfoItem
                          icon={
                            <FileText className="h-4 w-4 text-orange-600" />
                          }
                          label="No. Invoice"
                          value={selectedEvent.no_invoice || "-"}
                        />
                      </div>
                      <div className="space-y-4">
                        <InfoItem
                          icon={
                            <CalendarIcon className="h-4 w-4 text-red-600" />
                          }
                          label="Tanggal"
                          value={formatTanggalDisplay(
                            selectedEvent.tanggal_instalasi
                          )}
                        />
                        <InfoItem
                          icon={<Clock className="h-4 w-4 text-indigo-600" />}
                          label="Waktu"
                          value={selectedEvent.pukul_instalasi}
                        />
                        <InfoItem
                          icon={
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          }
                          label="Tipe Langganan"
                          value={selectedEvent.tipe_langganan}
                        />
                        <InfoItem
                          icon={<Link2 className="h-4 w-4 text-blue-600" />}
                          label="Link Meet"
                          value={selectedEvent.link_meet || "-"}
                          isLink={!!selectedEvent.link_meet}
                        />
                      </div>
                    </div>

                    {/* Alamat */}
                    <div className="border-t pt-4">
                      <InfoItem
                        icon={<MapPin className="h-4 w-4 text-red-600" />}
                        label="Alamat Lengkap"
                        value={selectedEvent.alamat}
                        fullWidth
                      />
                    </div>

                    {/* Riwayat Pesan */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        Riwayat Pesan Terkirim
                      </h4>
                      {selectedEvent.log_pesan &&
                      selectedEvent.log_pesan.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedEvent.log_pesan.map((log) => (
                            <div
                              key={log.id}
                              className="bg-slate-50 rounded-lg p-3 border"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-sm">
                                  {log.tipe_pesan}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.created_at).toLocaleString(
                                    "id-ID"
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic bg-slate-50 rounded-lg p-4 text-center">
                          Belum ada riwayat pesan terkirim untuk jadwal ini.
                        </p>
                      )}
                    </div>
                  </div>

                  <DialogFooter className="bg-slate-50/50 border-t p-6 rounded-b-2xl gap-3">
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      className="gap-2 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="gap-2 rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                      Ubah
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={closeModal}
                      className="gap-2 rounded-xl"
                    >
                      <X className="h-4 w-4" />
                      Tutup
                    </Button>
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

// Komponen Info Item untuk tampilan yang konsisten
interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  fullWidth?: boolean;
  isLink?: boolean;
}

function InfoItem({
  icon,
  label,
  value,
  fullWidth = false,
  isLink = false,
}: InfoItemProps) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <div className="flex items-start gap-3">
        <div className="p-1 bg-slate-100 rounded-lg mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 mb-1">{label}</p>
          {isLink && value !== "-" ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline wrap-break-word"
            >
              {value}
            </a>
          ) : (
            <p className="text-sm text-slate-900 wrap-break-word">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Komponen FormInput dengan icon
interface FormInputProps {
  label: string;
  name: string;
  value?: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
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
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={name}
        className="flex items-center gap-2 text-sm font-medium"
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
        className="rounded-xl border-2 focus:border-blue-300 transition-colors"
      />
    </div>
  );
}

// Tambahkan CSS kustom untuk kalender
const calendarStyles = `
  .event-online {
    background-color: #10b981 !important;
    border-color: #059669 !important;
  }
  .event-offline {
    background-color: #f59e0b !important;
    border-color: #d97706 !important;
  }
  .rbc-event {
    border-radius: 8px;
    border: none;
    padding: 2px 8px;
    font-size: 0.875rem;
  }
  .rbc-today {
    background-color: #eff6ff;
  }
  .rbc-header {
    padding: 8px;
    font-weight: 600;
  }
  .rbc-date-cell {
    padding: 4px 8px;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = calendarStyles;
  document.head.appendChild(styleSheet);
}
