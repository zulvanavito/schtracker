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

// (Interface Tipe Data Anda: LogPesan, Jadwal, EditFormData)
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

  async function fetchJadwal() {
    setLoading(true);

    try {
      const response = await fetch("/api/get-jadwal", {
        cache: "no-store",
      });
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
            console.log("🔑 Mengirim google_access_token untuk penghapusan");
          } else {
            console.log(
              "⚠️ Provider token tidak tersedia, hanya hapus dari database"
            );
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

          console.log("🔑 Session Info untuk Update:", {
            hasSession: !!session,
            user: session.user?.email,
            hasAccessToken: !!session.access_token,
            hasProviderToken: !!session.provider_token,
            appMetadata: session.user?.app_metadata,
          });

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
            console.log("✅ Mengirim google_access_token untuk update");
          } else {
            console.warn("⚠️ Provider token tidak tersedia untuk update");
          }

          console.log("📤 Data yang dikirim ke API ubah-jadwal:", {
            id: requestBody.id,
            tipe_outlet: requestBody.tipe_outlet,
            hasGoogleEventId: !!requestBody.google_event_id,
            hasGoogleAccessToken: !!requestBody.google_access_token,
          });

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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Papan Jadwal (Kalender)</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/tabel">Daftar Tabel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Tambah Jadwal</Link>
          </Button>
          <AuthButton />
        </div>
      </header>
      <p className="mb-4 text-muted-foreground">
        Durasi jadwal di kalender kini otomatis berdasarkan Tipe Langganan &
        Tipe Outlet.
      </p>

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
            eventPropGetter={eventPropGetter}
          />
        )}
      </div>

      {/* PERBAIKAN: Modal dengan sintaks JSX yang benar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              {isEditing ? (
                // PERBAIKAN: Hapus karakter minus dan kurung yang tidak perlu
                <form onSubmit={handleUpdateSubmit}>
                  <DialogHeader>
                    <DialogTitle>Ubah Jadwal</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
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

                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="sm:col-span-2">
                        <FormInput
                          label="Hari Instalasi"
                          name="hari_instalasi"
                          value={editFormData?.hari_instalasi}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tanggal Instalasi</Label>
                        <DatePicker
                          date={editFormData?.tanggal_instalasi}
                          onSelect={handleEditDateChange}
                        />
                      </div>
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

                    <div className="md:col-span-2">
                      <FormInput
                        label="Link Meet (Akan Dibuat Otomatis)"
                        name="link_meet"
                        value={editFormData?.link_meet}
                        onChange={handleEditInputChange}
                        disabled={true}
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
