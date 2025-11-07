"use client";

import { useState, useEffect } from "react";
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
import type { Event as BigCalendarEvent } from "react-big-calendar";

// Definisikan Tipe Data
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

// Tipe data untuk form edit (bisa sebagian)
type EditFormData = Partial<Jadwal>;

const localizer = momentLocalizer(moment);

// Fungsi Hitung Durasi
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

export default function HalamanJadwal() {
  // FIX Error #3: Ganti 'any[]' dengan tipe yang lebih spesifik
  const [events, setEvents] = useState<BigCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Jadwal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);

  // Fungsi Fetch Jadwal
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
          resource: item, // Simpan data asli di sini
        };
      });
      setEvents(formattedEvents);
    } catch (err: unknown) {
      // FIX Error #4: Ganti 'any' dengan 'unknown'
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

  // --- Fungsi Modal ---
  const openModal = (eventResource: Jadwal) => {
    // Perbaikan bug visual tumpang tindih
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }

    setSelectedEvent(eventResource);
    setEditFormData(eventResource);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setEditFormData(null);
  };

  // --- Fungsi Hapus ---
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
      error: (err: Error) => `Error: ${err.message}`, // FIX Error #5
    });
  };

  // --- Fungsi Edit ---
  const handleEditFormChange = (name: string, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "tipe_outlet" && value === "Offline" && { link_meet: "" }),
    }));
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const response = await fetch("/api/ubah-jadwal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editFormData),
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
      error: (err: Error) => `Error: ${err.message}`, // FIX Error (tambahan)
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* CSS untuk kalender sudah ada di globals.css */}

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

      {/* Komponen Kalender */}
      <div className="h-[75vh]">
        {loading ? (
          <p>Memuat kalender...</p>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={["month", "week", "day"]}
            // FIX Error #6: Tipe 'event' sekarang akan otomatis dikenali dari library
            onSelectEvent={(event) => openModal(event.resource as Jadwal)}
          />
        )}
      </div>

      {/* --- Modal (Dialog) untuk Detail/Edit --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              {isEditing ? (
                // --- MODE EDIT ---
                <form onSubmit={handleUpdateSubmit}>
                  <DialogHeader>
                    <DialogTitle>Ubah Jadwal</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {/* Kolom Kiri */}
                    <div className="space-y-4">
                      <FormInput
                        label="Nama Outlet"
                        name="nama_outlet"
                        value={editFormData?.nama_outlet}
                        onChange={handleEditFormChange}
                      />
                      <FormInput
                        label="No Telepon"
                        name="no_telepon"
                        value={editFormData?.no_telepon}
                        onChange={handleEditFormChange}
                      />
                      <FormInput
                        label="Alamat"
                        name="alamat"
                        value={editFormData?.alamat}
                        onChange={handleEditFormChange}
                      />
                      <FormInput
                        label="SCH Leads"
                        name="sch_leads"
                        value={editFormData?.sch_leads}
                        onChange={handleEditFormChange}
                      />
                      <FormInput
                        label="Hari Instalasi"
                        name="hari_instalasi"
                        value={editFormData?.hari_instalasi}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>
                    {/* Kolom Kanan */}
                    <div className="space-y-4">
                      <FormInput
                        label="Nama Owner"
                        name="nama_owner"
                        value={editFormData?.nama_owner}
                        onChange={handleEditFormChange}
                      />
                      <FormInput
                        label="No Invoice"
                        name="no_invoice"
                        value={editFormData?.no_invoice}
                        onChange={handleEditFormChange}
                      />

                      <div className="space-y-2">
                        <Label>Tipe (Online/Offline)</Label>
                        <Select
                          name="tipe_outlet"
                          value={editFormData?.tipe_outlet}
                          onValueChange={(v) =>
                            handleEditFormChange("tipe_outlet", v)
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
                        onChange={handleEditFormChange}
                      />
                      <FormInput
                        label="Tanggal Instalasi"
                        name="tanggal_instalasi"
                        value={editFormData?.tanggal_instalasi}
                        onChange={handleEditFormChange}
                        type="date"
                        required
                      />
                      <FormInput
                        label="Pukul Instalasi"
                        name="pukul_instalasi"
                        value={editFormData?.pukul_instalasi}
                        onChange={handleEditFormChange}
                        type="time"
                        required
                      />
                    </div>
                    {/* Bawah */}
                    <div className="md:col-span-2">
                      <FormInput
                        label="Link Meet"
                        name="link_meet"
                        value={editFormData?.link_meet}
                        onChange={handleEditFormChange}
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
                // --- MODE VIEW ---
                <>
                  <DialogHeader>
                    <DialogTitle>Detail Jadwal</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-2">
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

// Helper komponen FormInput baru (sama seperti di index.jsx)
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
