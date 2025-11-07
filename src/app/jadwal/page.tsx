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

// ... (Interface Tipe Data Anda: LogPesan, Jadwal, EditFormData) ...
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
}

// ... (Opsi `hours` dan `minutes` Anda) ...
const hours = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const minutes = ["00", "15", "30", "45"];

const localizer = momentLocalizer(moment);

// ... (Fungsi calculateDurationInMs Anda) ...
function calculateDurationInMs(item: Jadwal) {
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

// --- BARU: Fungsi untuk menentukan style event ---
const eventPropGetter = (event: BigCalendarEvent) => {
  const resource = event.resource as Jadwal; // Ambil data asli kita
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

  // ... (Semua state Anda: date, view, isModalOpen, dll) ...
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Jadwal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);

  // ... (Fungsi fetchJadwal Anda - tidak berubah) ...
  async function fetchJadwal() {
    setLoading(true);
    try {
      const response = await fetch("/api/get-jadwal");
      if (!response.ok) throw new Error("Gagal mengambil data jadwal");
      const dataJadwal: Jadwal[] = await response.json();

      const formattedEvents = dataJadwal.map((item) => {
        const startDate = new Date(
          `${item.tanggal_instalasi}T${item.pukul_instalasi}`
        );
        const durationMs = calculateDurationInMs(item);
        const endDate = new Date(startDate.getTime() + durationMs);
        return {
          title: `[${item.tipe_outlet}] - ${item.nama_outlet}`,
          start: startDate,
          end: endDate,
          resource: item,
        };
      });
      setEvents(formattedEvents);
    } catch (err: unknown) {
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

  // ... (Fungsi onNavigate, onView - tidak berubah) ...
  const onNavigate = useCallback(
    (newDate: Date) => setDate(newDate),
    [setDate]
  );
  const onView = useCallback((newView: View) => setView(newView), [setView]);

  // ... (Fungsi openModal, closeModal - tidak berubah) ...
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

  // ... (Fungsi handleDelete - tidak berubah) ...
  const handleDelete = async () => {
    if (!selectedEvent) return;
    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const response = await fetch("/api/hapus-jadwal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedEvent.id }),
          });
          if (!response.ok) throw new Error("Gagal menghapus");
          fetchJadwal();
          closeModal();
          resolve("Jadwal berhasil dihapus!");
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

  // ... (Fungsi handleEditInputChange, handleEditSelectChange, handleEditDateChange, handleEditTimeChange - tidak berubah) ...
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

  // ... (Fungsi handleUpdateSubmit - tidak berubah) ...
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
    const dataToSend = {
      ...editFormData,
      tanggal_instalasi: format(editFormData.tanggal_instalasi, "yyyy-MM-dd"),
    };
    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const response = await fetch("/api/ubah-jadwal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSend),
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
      error: (err: any) => `Error: ${err.message}`,
    });
  };

  const [editHour = "", editMinute = ""] = (
    editFormData?.pukul_instalasi || ""
  ).split(":");

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* ... (Header Anda - tidak berubah) ... */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Papan Jadwal (Kalender)</h1>
        <Button asChild>
          <Link href="/">Kembali ke Halaman Utama</Link>
        </Button>
      </header>
      <p className="mb-4 text-muted-foreground">
        Durasi jadwal di kalender kini otomatis berdasarkan Tipe Langganan &
        Tipe Outlet.
      </p>

      {/* --- Perubahan pada Komponen Kalender --- */}
      <div className="h-[75vh]">
        {loading ? (
          <p>Memuat kalender...</p>
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
            // --- INI DIA PERUBAHANNYA ---
            eventPropGetter={eventPropGetter}
          />
        )}
      </div>

      {/* --- Modal (Dialog) untuk Detail/Edit (TIDAK BERUBAH) --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              {isEditing ? (
                // --- MODE EDIT (TIDAK BERUBAH) ---
                <form onSubmit={handleUpdateSubmit}>
                  {/* ... (Isi form edit Anda) ... */}
                  <DialogHeader>
                    <DialogTitle>Ubah Jadwal</DialogTitle>
                  </DialogHeader>
                  {/* --- Layout Form Diperbarui --- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {/* Kolom Kiri */}
                    <div className="space-y-4">
                      <FormInput
                        label="Nama Outlet"
                        name="nama_outlet"
                        value={editFormData?.nama_outlet}
                        onChange={handleEditInputChange}
                      />
                      <FormInput
                        label="No Telepon"
                        name="no_telepon"
                        value={editFormData?.no_telepon}
                        onChange={handleEditInputChange}
                      />
                      <FormInput
                        label="Alamat"
                        name="alamat"
                        value={editFormData?.alamat}
                        onChange={handleEditInputChange}
                      />
                      <FormInput
                        label="SCH Leads"
                        name="sch_leads"
                        value={editFormData?.sch_leads}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    {/* Kolom Kanan */}
                    <div className="space-y-4">
                      <FormInput
                        label="Nama Owner"
                        name="nama_owner"
                        value={editFormData?.nama_owner}
                        onChange={handleEditInputChange}
                      />
                      <FormInput
                        label="No Invoice"
                        name="no_invoice"
                        value={editFormData?.no_invoice}
                        onChange={handleEditInputChange}
                      />
                      <div className="space-y-2">
                        <Label>Tipe (Online/Offline)</Label>
                        <Select
                          name="tipe_outlet"
                          value={editFormData?.tipe_outlet}
                          onValueChange={(v) =>
                            handleEditSelectChange("tipe_outlet", v)
                          }
                        >
                          <SelectTrigger>
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

                    {/* --- Bagian Jadwal (Layout Baru) --- */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      {/* Hari Instalasi (Satu Baris Penuh di 'sm' tapi setengah di 'md' - kita perbaiki) */}
                      <div className="sm:col-span-2">
                        <FormInput
                          label="Hari Instalasi"
                          name="hari_instalasi"
                          value={editFormData?.hari_instalasi}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>

                      {/* Tanggal Instalasi */}
                      <div className="space-y-2">
                        <Label>Tanggal Instalasi</Label>
                        <DatePicker
                          date={editFormData?.tanggal_instalasi}
                          onSelect={handleEditDateChange}
                        />
                      </div>

                      {/* Pukul Instalasi */}
                      <div className="space-y-2">
                        <Label>Pukul Instalasi</Label>
                        <div className="flex gap-2">
                          <Select
                            value={editHour}
                            onValueChange={(value) =>
                              handleEditTimeChange("hour", value)
                            }
                            required
                          >
                            <SelectTrigger className="w-1/2">
                              <SelectValue placeholder="Jam" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {hours.map((hour) => (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
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
                            <SelectTrigger className="w-1/2">
                              <SelectValue placeholder="Menit" />
                            </SelectTrigger>
                            <SelectContent>
                              {minutes.map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  {minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Link Meet (Satu Baris Penuh) */}
                    <div className="md:col-span-2">
                      <FormInput
                        label="Link Meet"
                        name="link_meet"
                        value={editFormData?.link_meet}
                        onChange={handleEditInputChange}
                        disabled={editFormData?.tipe_outlet === "Offline"}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Batal
                    </Button>
                    <Button type="submit">Simpan Perubahan</Button>
                  </DialogFooter>
                </form>
              ) : (
                // --- MODE VIEW (TIDAK BERUBAH) ---
                <>
                  <DialogHeader>
                    <DialogTitle>Detail Jadwal</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-2">
                    {/* ... (Isi mode view Anda) ... */}
                    <p>
                      <strong>Outlet:</strong> {selectedEvent.nama_outlet}
                    </p>
                    <p>
                      <strong>Owner:</strong> {selectedEvent.nama_owner}
                    </p>
                    <p>
                      <strong>SCH Leads:</strong>{" "}
                      {selectedEvent.sch_leads || "-"}
                    </p>
                    <p>
                      <strong>Tanggal:</strong>{" "}
                      {selectedEvent.tanggal_instalasi} | <strong>Jam:</strong>{" "}
                      {selectedEvent.pukul_instalasi}
                    </p>
                    <p>
                      <strong>Tipe:</strong> {selectedEvent.tipe_outlet} (
                      {selectedEvent.tipe_langganan})
                    </p>
                    <p>
                      <strong>No. HP:</strong> {selectedEvent.no_telepon}
                    </p>
                    <p>
                      <strong>Alamat:</strong> {selectedEvent.alamat}
                    </p>
                    <p>
                      <strong>Link Meet:</strong>{" "}
                      {selectedEvent.link_meet || "-"}
                    </p>
                    <div className="pt-4">
                      <strong>Riwayat Pesan (Log):</strong>
                      {selectedEvent.log_pesan &&
                      selectedEvent.log_pesan.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                          {selectedEvent.log_pesan.map((log) => (
                            <li key={log.id}>
                              {new Date(log.created_at).toLocaleString("id-ID")}{" "}
                              - <strong>{log.tipe_pesan}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Belum ada log pesan tersimpan.
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="destructive" onClick={handleDelete}>
                      Hapus Jadwal
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(true)}
                    >
                      Ubah Jadwal
                    </Button>
                    <Button variant="outline" onClick={closeModal}>
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

// ... (Helper FormInput Anda - tidak berubah) ...
interface FormInputProps {
  label: string;
  name: string;
  value?: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}
function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        value={value || ""}
        onChange={(e) => onChange(e.target.name, e.target.value)}
        type={type}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
