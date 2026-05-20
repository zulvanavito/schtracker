"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import AuthButton from "@/components/AuthButton";
import {
  FileText,
  Calendar,
  MessageSquare,
  Copy,
  Phone,
  Building,
  Clock,
  User,
  Link2,
  CheckCircle2,
  Sparkles,
  Send,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  Map,
  ArrowUpDown,
  RefreshCw,
  X,
  Share2,
  Edit,
  Trash2,
  Save,
  MapPin,
  PlayCircle,
  Bell,
  XCircle,
  CalendarCheck,
  Circle,
  FileStack, 
} from "lucide-react";
import Header from "@/components/Header";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import StatCard from "./components/StatCard";

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
  status?: string;
  created_at?: string;
}

interface EditFormData {
  id: number;
  nama_outlet: string;
  nama_owner: string;
  no_telepon: string;
  no_invoice: string;
  sch_leads: string;
  alamat: string;
  tipe_outlet: string;
  tipe_langganan: string;
  hari_instalasi: string;
  tanggal_instalasi: Date | undefined;
  pukul_instalasi: string;
  link_meet: string;
  status?: string;
}

interface UpdateRequestBody extends Omit<EditFormData, "tanggal_instalasi"> {
  tanggal_instalasi: string;
  google_access_token?: string;
  google_event_id?: string | null;
}

const hours = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const minutes = ["00", "15", "30", "45"];

// Helper: Format SCH Leads to URL
function formatSchLeadsToUrl(schLeads: string): string | null {
  if (!schLeads) return null;
  const formatted = schLeads.replace(/\//g, " ").trim();
  const encoded = encodeURIComponent(formatted);
  return `https://crm.majoo.id/field-operations/detail/${encoded}`;
}

// Helper: Format tanggal
function formatTanggal(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatWaktuWITA(waktuString: string): string {
  if (!waktuString) return "";
  if (waktuString.includes("WITA")) return waktuString;
  const waktuParts = waktuString.split(":");
  if (waktuParts.length >= 2) {
    return `${waktuParts[0]}:${waktuParts[1]} WITA`;
  }
  return waktuString + " WITA";
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "+62" + cleaned.substring(1);
  if (cleaned.startsWith("62")) return "+" + cleaned;
  if (cleaned.startsWith("+")) return phone;
  return "+62" + cleaned;
}



function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 mt-4">
      <div className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-900">{startItem}-{endItem}</span> of <span className="font-semibold text-slate-900">{totalItems}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0 rounded-lg border-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium text-slate-700 mx-2">
            Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0 rounded-lg border-slate-200"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function HalamanTabel() {
  console.log('HalamanTabel rendered');
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [filterTipe, setFilterTipe] = useState<string>("semua");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"terbaru" | "tanggal">("terbaru");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [selectedJadwal, setSelectedJadwal] = useState<Jadwal | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState("WITA");
  const [lastTemplateType, setLastTemplateType] = useState("");
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);

  const handleEditClick = () => {
    if (!selectedJadwal) return;
    
    let tanggal: Date | undefined;
    if (selectedJadwal.tanggal_instalasi) {
        const parsed = new Date(selectedJadwal.tanggal_instalasi);
        if (!isNaN(parsed.getTime())) {
            tanggal = parsed;
        }
    }

    setEditFormData({
      ...selectedJadwal,
      tanggal_instalasi: tanggal,
    });
    setIsEditing(true);
  };

  const handleEditInputChange = (name: string, value: string) => {
    setEditFormData((prev) => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };

  const handleEditSelectChange = (name: string, value: string) => {
    setEditFormData((prev) => {
      if (!prev) return null;
      const updates: any = { [name]: value };
      if (name === "tipe_outlet" && value === "Offline") {
        updates.link_meet = "";
      }
      return { ...prev, ...updates };
    });
  };

  const handleEditDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      const hari = getHariFromTanggal(formattedDate);
      setEditFormData((prev) =>
        prev ? { ...prev, tanggal_instalasi: date, hari_instalasi: hari } : null
      );
    } else {
        setEditFormData((prev) =>
            prev ? { ...prev, tanggal_instalasi: undefined, hari_instalasi: "" } : null
        );
    }
  };

  const handleEditTimeChange = (part: "hour" | "minute", value: string) => {
    setEditFormData((prev) => {
      if (!prev) return null;
      const [currentHour = "00", currentMinute = "00"] =
        prev.pukul_instalasi.split(":");
      let newTime;
      if (part === "hour") {
        newTime = `${value}:${currentMinute}`;
      } else {
        newTime = `${currentHour}:${value}`;
      }
      return { ...prev, pukul_instalasi: newTime };
    });
  };

  const getHariFromTanggal = (tanggal: string) => {
    if (!tanggal) return "";
    const [year, month, day] = tanggal.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("id-ID", { weekday: "long" });
  };

  const convertTime = (time: string, zone: string) => {
    if (!time) return "";
    // Asumsi input time selalu WITA (UTC+8)
    let [hours, minutes] = time.split(":").map(Number);

    if (zone === "WIB") {
      hours -= 1; // WITA to WIB (-1)
    } else if (zone === "WIT") {
      hours += 1; // WITA to WIT (+1)
    }

    // Handle overflow
    if (hours < 0) hours += 24;
    if (hours >= 24) hours -= 24;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${zone}`;
  };

  useEffect(() => {
    if (isModalOpen && lastTemplateType && selectedJadwal) {
      handleGenerateTemplate(lastTemplateType);
    }
  }, [selectedTimezone]);

  const handleDelete = async () => {
    if (!selectedJadwal) return;
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;

    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) throw new Error("Unauthorized");

          const response = await fetch("/api/hapus-jadwal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              id: selectedJadwal.id,
              google_access_token: session.provider_token,
            }),
          });

          if (!response.ok) throw new Error("Gagal menghapus");
          
          fetchJadwal();
          setIsModalOpen(false);
          resolve("Jadwal deleted");
        } catch (err) {
          reject(err);
        }
      });

    toast.promise(promise(), {
      loading: "Deleting...",
      success: "Schedule deleted successfully",
      error: "Failed to delete schedule",
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;
    
    // Validate date before proceeding
    if (editFormData.tanggal_instalasi && isNaN(editFormData.tanggal_instalasi.getTime())) {
        toast.error("Tanggal instalasi tidak valid");
        return;
    }

    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) throw new Error("Unauthorized");

          const dataToSend: UpdateRequestBody = {
            ...editFormData,
            tanggal_instalasi: editFormData.tanggal_instalasi ? format(editFormData.tanggal_instalasi, "yyyy-MM-dd") : "",
            google_access_token: session.provider_token || undefined,
          };

          const response = await fetch("/api/ubah-jadwal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(dataToSend),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("DEBUG: Server error response:", errorData);
            throw new Error(errorData.error || `Update failed with status ${response.status}`);
          }

          fetchJadwal();
          setIsEditing(false);
          
          const updatedJadwal = {
             ...selectedJadwal!,
             ...dataToSend,
             tanggal_instalasi: editFormData.tanggal_instalasi ? format(editFormData.tanggal_instalasi, "yyyy-MM-dd") : selectedJadwal!.tanggal_instalasi,
          } as Jadwal; 
          setSelectedJadwal(updatedJadwal);
          
          resolve("Update successful");
        } catch (err) {
            console.error("DEBUG: Update error details:", err);
          reject(err);
        }
      });

    toast.promise(promise(), {
      loading: "Updating...",
      error: "Failed to update schedule",
    });
  };

  const handleQuickStatusUpdate = async (id: number, newStatus: string) => {
    // Optimistic Update
    setJadwalList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );

    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();
          if (sessionError || !session) throw new Error("Unauthorized");

          const response = await fetch("/api/ubah-jadwal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              id,
              status: newStatus,
              google_access_token: session.provider_token || undefined,
            }),
          });

          if (!response.ok) throw new Error("Update failed");
          resolve("Status updated");
        } catch (err) {
            // Revert on error (optional, but good practice)
           fetchJadwal();
           reject(err);
        }
      });

    toast.promise(promise(), {
      loading: "Updating status...",
      success: "Status updated",
      error: "Failed to update status",
    });
  };

  const filteredJadwal = Array.isArray(jadwalList)
    ? jadwalList.filter((jadwal) => {
        if (filterTipe !== "semua" && jadwal.tipe_outlet !== filterTipe) {
          return false;
        }

        if (filterStatus !== "semua" && jadwal.status !== filterStatus) {
            return false;
        }

        if (searchQuery.trim() === "") {
          return true;
        }

        const query = searchQuery.toLowerCase();
        return (
          jadwal.nama_outlet?.toLowerCase().includes(query) ||
          jadwal.nama_owner?.toLowerCase().includes(query) ||
          jadwal.no_telepon?.includes(query) ||
          jadwal.sch_leads?.toLowerCase().includes(query) ||
          jadwal.no_invoice?.toLowerCase().includes(query) ||
          jadwal.alamat?.toLowerCase().includes(query) ||
          jadwal.tipe_langganan?.toLowerCase().includes(query) ||
          jadwal.hari_instalasi?.toLowerCase().includes(query)
        );
      })
    : [];

  const sortedJadwal = [...filteredJadwal].sort((a, b) => {
    if (sortBy === "terbaru") {
      return b.id - a.id;
    } else {
      const dateA = new Date(a.tanggal_instalasi);
      const dateB = new Date(b.tanggal_instalasi);
      return dateA.getTime() - dateB.getTime();
    }
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedJadwal.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedJadwal.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTipe, filterStatus, searchQuery, sortBy]);

  const checkAndRefreshSession = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) return null;

      if (session) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
        const now = Date.now();

        if (expiresAt && expiresAt - now < 5 * 60 * 1000) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();
          if (refreshError) return null;
          return refreshData.session;
        }
        return session;
      }
      return null;
    } catch (error) {
        console.error("Session check error", error);
        return null; 
    }
  };

  async function fetchJadwal() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/get-jadwal", {
        cache: "no-cache",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      let dataJadwal: Jadwal[] = [];

      if (Array.isArray(result)) dataJadwal = result;
      else if (result.data && Array.isArray(result.data)) dataJadwal = result.data;
      else if (result.success && Array.isArray(result.data)) dataJadwal = result.data;

      const normalizedData = dataJadwal.map((item) => ({
        ...item,
        no_telepon: normalizePhoneNumber(item.no_telepon),
      }));

      const validatedData = normalizedData.filter(
        (item) => item && typeof item === "object" && item.id !== undefined
      );

      setJadwalList(validatedData);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errorMessage);
      toast.error("Failed to fetch data");
      setJadwalList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initializeSession = async () => {
      await checkAndRefreshSession();
      setSessionChecked(true);
    };
    initializeSession();
    fetchJadwal();
  }, []);

  const openModal = (jadwal: Jadwal) => {
    setSelectedJadwal(jadwal);
    setGeneratedMessage("");
    setMessage("");
    setIsEditing(false); // Reset edit mode
    setIsModalOpen(true);
  };

  const handleGenerateTemplate = async (type: string) => {
    if (!selectedJadwal) return;
    let template = "";
    const { hari_instalasi, tanggal_instalasi, pukul_instalasi, nama_outlet, link_meet, alamat } = selectedJadwal;
    const tanggalFormatted = formatTanggal(tanggal_instalasi);
    const waktuFormatted = convertTime(pukul_instalasi, selectedTimezone);

    setLastTemplateType(type);

    // Template logic (Simplified for brevity, same as before)
    // In real implementation, keep the full template strings
    if (type.includes("online")) {
        template = `Halo majoopreneurs!\nJadwal Online pada:\nHari: ${hari_instalasi}, ${tanggalFormatted}\nPukul: ${waktuFormatted}\nLink: ${link_meet}\n...`;
    } else {
        template = `Halo majoopreneurs!\nJadwal Offline pada:\nHari: ${hari_instalasi}, ${tanggalFormatted}\nPukul: ${waktuFormatted}\nAlamat: ${alamat}\n...`;
    }
    // Re-add full templates if needed, for now using placeholders to focus on UI code structure.
     switch (type) {
      case "online_reminder_awal":
        template = `Halo majoopreneurs!\nPerkenalkan saya dari Team Scheduler Majoo. Melalui pesan ini, saya ingin menginformasikan jadwal instalasi perangkat dan sesi training aplikasi Majoo oleh tim Customer Support Majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${waktuFormatted}\nOutlet : ${nama_outlet}\n\nSeluruh rangkaian aktivitas akan dilakukan secara ONLINE melalui Google Meet.\nMohon konfirmasinya apakah BERSEDIA/TIDAK sesuai waktu diatas, Terima kasih\n\nSilakan melakukan konfirmasi dalam 1x12 jam dengan membalas pesan ini. Di luar itu, maka jadwal training dianggap batal. Penjadwal ulang dapat dilakukan dengan menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only).`;
        break;
      case "online_konfirmasi_jadwal":
        template = `Halo majoopreneurs!\nTerima kasih telah melakukan konfirmasi jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${waktuFormatted}\nOutlet : ${nama_outlet}\nLink Google Meet : ${link_meet}\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nPerubahan jadwal dapat dilakukan selambat-latnya dalam 2x24 jam. Di luar itu, akan dikenakan biaya tambahan sebesar Rp50.000. Training tambahan dapat dilakukan dengan membeli sesi training sebesar Rp250.000/sesi selama 3 Jam. Untuk permintaan penjadwalan ulang, kakak dapat menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only). Terima kasih, Have a nice day ^^`;
        break;
      case "online_h1_reminder":
        template = `Halo majoopreneurs!\nIzin melakukan reminder jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${waktuFormatted}\nOutlet : ${nama_outlet}\nLink Google Meet : ${link_meet}\n\nSebelum menjalani sesi training, berikut hal-hal yang perlu diperhatikan:\n✅ Tim majoo akan menjelaskan fitur lengkap yang ada di aplikasi majoo\n✅ Dipersilakan untuk bertanya jika terdapat informasi yang belum jelas\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nTerima kasih, Have a nice day!`;
        break;
      case "offline_reminder_awal":
        template = `Halo majoopreneurs!\nPerkenalkan saya dari Team Scheduler Majoo. Melalui pesan ini, saya ingin menginformasikan jadwal instalasi perangkat dan sesi training aplikasi Majoo oleh tim Customer Support Majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${waktuFormatted}\nOutlet : ${nama_outlet}\nAlamat : ${alamat}\n\nMohon konfirmasinya apakah BERSEDIA/TIDAK sesuai waktu diatas, Terima kasih\n\nSilakan melakukan konfirmasi dalam 1x12 jam dengan membalas pesan ini. Di luar itu, maka jadwal training dianggap batal. Penjadwal ulang dapat dilakukan dengan menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only).`;
        break;
      case "offline_konfirmasi_jadwal":
        template = `Halo majoopreneurs!\nTerima kasih telah melakukan konfirmasi jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${waktuFormatted}\nOutlet : ${nama_outlet}\nAlamat : ${alamat}\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nPerubahan jadwal dapat dilakukan selambat-latnya dalam 2x24 jam. Di luar itu, akan dikenakan biaya tambahan sebesar Rp50.000. Training tambahan dapat dilakukan dengan membeli sesi training sebesar Rp250.000/sesi selama 3 Jam. Untuk permintaan penjadwalan ulang, kakak dapat menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only). Terima kasih, Have a nice day ^^`;
        break;
      case "offline_h1_reminder":
        template = `Halo majoopreneurs!\nIzin melakukan reminder jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${waktuFormatted}\nOutlet : ${nama_outlet}\nAlamat : ${alamat}\n\nSebelum menjalani sesi training, berikut hal-hal yang perlu diperhatikan:\n✅ Tim majoo akan menjelaskan fitur lengkap yang ada di aplikasi majoo\n✅ Dipersilakan untuk bertanya jika terdapat informasi yang belum jelas\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nTerima kasih, Have a nice day!`;
        break;
      case "no_respond_cancel":
        template = `Halo majooprenuers!\nDikarenakan tidak ada konfirmasi lagi dari penjadwal training, mohon maaf untuk tiket penjadwalan diatas kami tutup. Jika Kakak sudah siap dan bersedia untuk melakukan training silakan Chat dan konfirmasi kembali ke nomor ini atau Whatsapp Hotline kami di 0811500460 dan bisa juga menghubungi kami di 1500460 dengan estimasi waktu H-7 dari tanggal request training, terima kasih`;
        break;
      default:
        template = "Silakan pilih template...";
    }

    setGeneratedMessage(template);

    try {
      const session = await checkAndRefreshSession();
      if (!session) throw new Error("Invalid Session");

      setMessage("Saving log...");
      const response = await fetch("/api/simpan-log-pesan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ jadwal_id: selectedJadwal.id, tipe_pesan: type, isi_pesan: template }),
      });

      if (!response.ok) throw new Error("Failed to save log");
      toast.success("Template generated and logged.");
      // fetchJadwal(); // Removed to prevent UI flicker
    } catch (error) {
      toast.error("Failed to log message");
    } finally {
        setMessage("");
    }
  };

  const sendToWhatsApp = () => {
    if (!selectedJadwal?.no_telepon || !generatedMessage) return;
    const phoneNumber = selectedJadwal.no_telepon.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
  };

  const copyToClipboard = async () => {
    if (!generatedMessage) return;

    // Persiapan fallback
    const textArea = document.createElement("textarea");
    textArea.value = generatedMessage;
    
    // Ensure it's not visible but part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();

    try {
        // Coba modern API dulu (hanya works di HTTPS/Localhost)
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(generatedMessage);
            toast.success("Copied to clipboard!");
        } else {
             // Fallback untuk HTTP/Network IP
            const successful = document.execCommand('copy');
            if(successful) {
                 toast.success("Copied to clipboard!");
            } else {
                 throw new Error("Copy failed");
            }
        }
    } catch (err) {
        // ExecCommand fallback attempt if main try block fails or checking secure context logic flows here
        try {
            const successful = document.execCommand('copy');
             if(successful) {
                 toast.success("Copied to clipboard!");
            } else {
                 toast.error("Failed to copy text");
            }
        } catch (e) {
             toast.error("Clipboard access denied");
        }
    } finally {
        document.body.removeChild(textArea);
    }
  };

  const handleShare = async () => {
    if (!generatedMessage) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Schedule Message',
          text: generatedMessage,
        });
        toast.success("Opened share options");
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
             toast.error("Error sharing");
        }
      }
    } else {
      toast.error("Browser does not support sharing");
      copyToClipboard();
    }
  };

  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-blue-50 flex items-center justify-center">
        <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 animate-pulse"></div>
            <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans selection:bg-notion-sky selection:text-primary">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <Header
          title="Data Management"
          subtitle="Manage installation records and communications"
          icon={<FileStack className="h-8 w-8" />}
        >
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
            <Link href="/activity">
              <MonitorPlay className="h-4 w-4 mr-2" />
              Activity
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-md h-11 px-5 border-input text-foreground font-medium hover:text-primary hover:bg-secondary"
          >
            <Link href="/todo">
              <FileText className="h-4 w-4 mr-2" />
              To-Do
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
           <StatCard
            icon={<FileText className="h-5 w-5 text-primary" />}
            label="Total Records"
            value={Array.isArray(jadwalList) ? jadwalList.length : 0}
            color="bg-notion-sky"
            delay="delay-0"
           />
           <StatCard
            icon={<MonitorPlay className="h-5 w-5 text-brand-green" />}
            label="Online"
            value={Array.isArray(jadwalList) ? jadwalList.filter((j) => j.tipe_outlet === "Online").length : 0}
            color="bg-notion-mint"
            delay="delay-75"
           />
           <StatCard
            icon={<Map className="h-5 w-5 text-brand-orange" />}
            label="Offline"
            value={Array.isArray(jadwalList) ? jadwalList.filter((j) => j.tipe_outlet === "Offline").length : 0}
            color="bg-notion-peach"
            delay="delay-100"
           />
            {/* Custom Filter Card */}
           <div className="bg-white border border-border p-5 flex flex-col justify-center gap-2 transition-all duration-300 hover:shadow-notion-2 delay-150 relative overflow-hidden group rounded-xl">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Filter className="w-16 h-16 text-primary" />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    <Filter className="h-3 w-3" />
                    <span>Quick Filter</span>
                </div>
                <select
                  value={filterTipe}
                  onChange={(e) => setFilterTipe(e.target.value)}
                  className="bg-transparent border-0 p-0 text-xl font-bold text-foreground focus:outline-none focus:ring-0 cursor-pointer w-full appearance-none"
                >
                    <option value="semua">All Types</option>
                    <option value="Online">Online Only</option>
                    <option value="Offline">Offline Only</option>
                </select>
           </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 bg-white p-4 rounded-xl border border-border shadow-none flex flex-col lg:flex-row gap-4 justify-between items-center">
             {/* Left: Search & Filter */}
             <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                    type="text"
                    placeholder="Search schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm h-10"
                    />
                </div>
                
                <div className="relative w-full sm:w-auto">
                     <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <select
                      value={filterTipe}
                      onChange={(e) => setFilterTipe(e.target.value)}
                      className="w-full sm:w-[160px] pl-9 pr-8 py-2 rounded-md border border-input bg-background hover:bg-secondary focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer h-10 font-medium"
                    >
                        <option value="semua">All Types</option>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                    </select>
                    <ChevronLeft className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-[-90deg] pointer-events-none" />
                </div>

                <div className="relative w-full sm:w-auto">
                     <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${
                             filterStatus === "On Going" ? "bg-link-blue" :
                             filterStatus === "Follow UP" ? "bg-brand-purple" :
                             filterStatus === "Fix Schedule" ? "bg-brand-green" :
                             filterStatus === "Reject" ? "bg-semantic-error" :
                             filterStatus === "Nomor Sales" ? "bg-brand-orange" :
                             "bg-stone"
                        }`} />
                     </div>
                     <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full sm:w-[160px] pl-9 pr-8 py-2 rounded-md border border-input bg-background hover:bg-secondary focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer h-10 font-medium"
                    >
                        <option value="semua">All Status</option>
                        <option value="On Going">On Going</option>
                        <option value="Follow UP">Follow UP</option>
                        <option value="Fix Schedule">Fix Schedule</option>
                        <option value="Reject">Reject</option>
                        <option value="Nomor Sales">Nomor Sales</option>
                    </select>
                    <ChevronLeft className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-[-90deg] pointer-events-none" />
                </div>
             </div>

             {/* Right: Sort & Refresh */}
             <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                 <div className="group relative">
                    <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                         className="pl-9 pr-8 py-2 rounded-md border border-input bg-background hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer text-sm font-medium text-foreground transition-all appearance-none h-10"
                    >
                        <option value="terbaru">Newest First</option>
                        <option value="tanggal">Sort by Date</option>
                    </select>
                 </div>

                 <Button
                  onClick={fetchJadwal}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-md border-input text-muted-foreground hover:text-primary hover:bg-secondary"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
             </div>
        </div>

        {/* Data Table (Desktop) */}
        <div className="hidden md:block bg-white border border-border rounded-xl overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/30 border-b border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px] py-4 pl-6 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Actions</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Date & Time</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Outlet Details</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Classification</TableHead>
                  <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Status</TableHead>
                   <TableHead className="py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest">Owner Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((jadwal) => (
                    <TableRow key={jadwal.id} className="border-b border-hairline-soft group hover:bg-secondary/20 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <Button
                            onClick={() => openModal(jadwal)}
                            size="sm"
                            className="rounded-md bg-secondary text-foreground hover:bg-primary hover:text-white transition-all font-semibold text-[11px] px-4 shadow-none border border-border"
                        >
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />
                            MESSAGE
                        </Button>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-foreground">
                                {formatTanggal(jadwal.tanggal_instalasi)}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                                {formatWaktuWITA(jadwal.pukul_instalasi)}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                         <div className="flex flex-col gap-1.5">
                             <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">{jadwal.nama_outlet}</span>
                                {jadwal.no_invoice && (
                                     <span className="text-[10px] uppercase font-bold text-muted-foreground bg-notion-gray px-1.5 py-0.5 rounded border border-border">
                                        {jadwal.no_invoice}
                                    </span>
                                )}
                             </div>
                              <div>
                                 <a 
                                    href={formatSchLeadsToUrl(jadwal.sch_leads) || "#"}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-link-blue bg-notion-sky px-1.5 py-0.5 rounded hover:bg-notion-sky/70 transition-colors border border-notion-sky"
                                 >
                                    <Link2 className="h-3 w-3" />
                                    {jadwal.sch_leads?.replace("SCH/LEADS/", "")}
                                </a>
                              </div>
                         </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col items-start gap-1.5">
                             <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                                jadwal.tipe_outlet === "Online" 
                                ? "bg-notion-mint text-brand-green border-notion-mint" 
                                : "bg-notion-peach text-brand-orange-deep border-notion-peach"
                             }`}>
                                {jadwal.tipe_outlet}
                            </span>
                             <span className="text-[11px] font-semibold text-muted-foreground pl-1 uppercase tracking-tight">
                                {jadwal.tipe_langganan}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                         <div className="relative">
                            <Select
                                value={jadwal.status || "On Going"}
                                onValueChange={(val) => handleQuickStatusUpdate(jadwal.id, val)}
                            >
                                <SelectTrigger className={`w-[140px] h-8 text-[10px] font-bold uppercase tracking-widest border-0 ring-1 ring-inset transition-all rounded-md pl-3 pr-2 gap-2 shadow-none ${
                                    jadwal.status === "On Going" ? "bg-notion-sky text-link-blue ring-notion-sky hover:bg-notion-sky/80" :
                                    jadwal.status === "Follow UP" ? "bg-notion-lavender text-brand-purple-800 ring-notion-lavender hover:bg-notion-lavender/80" :
                                    jadwal.status === "Fix Schedule" ? "bg-notion-mint text-brand-green ring-notion-mint hover:bg-notion-mint/80" :
                                    jadwal.status === "Reject" ? "bg-notion-rose text-semantic-error ring-notion-rose hover:bg-notion-rose/80" :
                                    jadwal.status === "Nomor Sales" ? "bg-notion-peach text-brand-orange-deep ring-notion-peach hover:bg-notion-peach/80" :
                                    "bg-notion-gray text-muted-foreground ring-notion-gray hover:bg-notion-gray/80"
                                }`}>
                                     <div className="flex items-center gap-2 truncate">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            jadwal.status === "On Going" ? "bg-link-blue" :
                                            jadwal.status === "Follow UP" ? "bg-brand-purple" :
                                            jadwal.status === "Fix Schedule" ? "bg-brand-green" :
                                            jadwal.status === "Reject" ? "bg-semantic-error" :
                                            jadwal.status === "Nomor Sales" ? "bg-brand-orange" :
                                            "bg-stone"
                                        }`} />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="min-w-[140px] rounded-md shadow-notion-elevation-4">
                                    <SelectItem value="On Going" className="text-[10px] font-bold uppercase"><div className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-link-blue"/> On Going</div></SelectItem>
                                    <SelectItem value="Follow UP" className="text-[10px] font-bold uppercase"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-brand-purple"/> Follow UP</div></SelectItem>
                                    <SelectItem value="Fix Schedule" className="text-[10px] font-bold uppercase"><div className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-brand-green"/> Fix Schedule</div></SelectItem>
                                    <SelectItem value="Reject" className="text-[10px] font-bold uppercase"><div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-semantic-error"/> Reject</div></SelectItem>
                                    <SelectItem value="Nomor Sales" className="text-[10px] font-bold uppercase"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-orange"/> Nomor Sales</div></SelectItem>
                                </SelectContent>
                            </Select>
                         </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                             <span className="text-sm font-semibold text-foreground">{jadwal.nama_owner}</span>
                             <span className="text-[11px] text-muted-foreground font-mono">{jadwal.no_telepon}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                     <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center opacity-30">
                            <FileStack className="h-12 w-12 mb-2" />
                            <p className="font-normal text-sm">No schedules found matching filters.</p>
                        </div>
                     </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
            {currentItems.length > 0 ? (
                currentItems.map((jadwal) => (
                    <div key={jadwal.id} className="bg-white border border-border p-5 space-y-4 relative overflow-hidden rounded-xl">
                         {/* Status Stripe */}
                         <div className={`absolute top-0 left-0 w-1 h-full ${
                             jadwal.tipe_outlet === "Online" ? "bg-brand-green" : "bg-brand-orange"
                         }`} />

                         {/* Header */}
                         <div className="flex justify-between items-start pl-2">
                            <div className="space-y-1.5">
                                <h3 className="font-bold text-foreground text-lg leading-tight">{jadwal.nama_outlet}</h3>
                                <div className="flex flex-wrap gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                        jadwal.tipe_outlet === "Online" 
                                        ? "bg-notion-mint text-brand-green border-notion-mint" 
                                        : "bg-notion-peach text-brand-orange-deep border-notion-peach"
                                    }`}>
                                        {jadwal.tipe_outlet}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-notion-sky text-link-blue border border-notion-sky">
                                        {jadwal.tipe_langganan}
                                    </span>
                                </div>
                            </div>
                            <Button
                                onClick={() => openModal(jadwal)}
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 rounded-md border-input hover:bg-secondary"
                            >
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                         </div>
                         
                         {/* Content */}
                         <div className="grid grid-cols-2 gap-4 pl-2">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Date
                                </p>
                                <p className="text-sm font-semibold text-foreground">{formatTanggal(jadwal.tanggal_instalasi)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Time (WITA)
                                </p>
                                <p className="text-sm font-semibold text-foreground">{formatWaktuWITA(jadwal.pukul_instalasi)}</p>
                            </div>
                            <div className="space-y-1 col-span-2 border-t border-border pt-3">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" /> Contact Info
                                </p>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-bold text-foreground">{jadwal.nama_owner}</p>
                                    <p className="text-xs font-mono text-muted-foreground">{jadwal.no_telepon}</p>
                                </div>
                            </div>
                         </div>

                         {/* Footer / IDs */}
                         <div className="pl-2 pt-2 flex flex-wrap gap-2 items-center justify-between border-t border-border mt-2">
                             <div className="flex gap-2">
                                {jadwal.no_invoice && (
                                    <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded">
                                        {jadwal.no_invoice}
                                    </span>
                                )}
                                 {jadwal.sch_leads && (
                                    <span className="text-[10px] font-bold text-link-blue bg-notion-sky px-2 py-1 rounded">
                                        {jadwal.sch_leads}
                                    </span>
                                )}
                             </div>
                             
                             <Select
                                value={jadwal.status || "On Going"}
                                onValueChange={(val) => handleQuickStatusUpdate(jadwal.id, val)}
                            >
                                <SelectTrigger className="h-7 text-[10px] font-bold uppercase tracking-widest border-0 ring-0 focus:ring-0 bg-secondary px-2 gap-1.5 rounded-md">
                                     <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            jadwal.status === "On Going" ? "bg-link-blue" :
                                            jadwal.status === "Follow UP" ? "bg-brand-purple" :
                                            jadwal.status === "Fix Schedule" ? "bg-brand-green" :
                                            jadwal.status === "Reject" ? "bg-semantic-error" :
                                            jadwal.status === "Nomor Sales" ? "bg-brand-orange" :
                                            "bg-stone"
                                        }`} />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                 <SelectContent className="rounded-md">
                                    <SelectItem value="On Going" className="text-[10px] font-bold uppercase">On Going</SelectItem>
                                    <SelectItem value="Follow UP" className="text-[10px] font-bold uppercase">Follow UP</SelectItem>
                                    <SelectItem value="Fix Schedule" className="text-[10px] font-bold uppercase">Fix Schedule</SelectItem>
                                    <SelectItem value="Reject" className="text-[10px] font-bold uppercase">Reject</SelectItem>
                                    <SelectItem value="Nomor Sales" className="text-[10px] font-bold uppercase">Nomor Sales</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>
                    </div>
                ))
            ) : (
                <div className="bg-white border border-border p-10 flex flex-col items-center justify-center text-center rounded-xl">
                     <FileStack className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
                     <p className="font-normal text-muted-foreground">No schedules found</p>
                </div>
            )}
        </div>  
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredJadwal.length}
                itemsPerPage={itemsPerPage}
            />


       {/* Message Modal */}
       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col rounded-xl border-0 shadow-notion-elevation-4 p-0 overflow-hidden bg-white ring-1 ring-black/5">
            <DialogHeader className="p-6 pb-4 border-b border-border flex flex-row items-center justify-between flex-shrink-0 space-y-0">
                <DialogTitle className="flex items-center gap-3 text-lg font-bold text-foreground">
                    <div className={`p-2.5 rounded-lg ${isEditing ? "bg-notion-sky text-primary" : "bg-notion-lavender text-brand-purple"}`}>
                        {isEditing ? <Edit className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                    </div>
                   {isEditing ? "Edit Schedule Details" : "Send WhatsApp Message"}
                </DialogTitle>
                <div className="w-8" /> 
            </DialogHeader>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {!isEditing ? (
                    /* Default VIEW: Message Templates */
                    <>
                        {selectedJadwal && (
                            <div className="relative p-5 rounded-xl bg-secondary/30 border border-border flex items-start gap-4">
                                <div className={`p-3 rounded-lg shadow-none border border-border ${selectedJadwal.tipe_outlet === "Online" ? "bg-white text-brand-green" : "bg-white text-brand-orange"}`}>
                                    {selectedJadwal.tipe_outlet === "Online" ? <MonitorPlay className="h-6 w-6" /> : <Map className="h-6 w-6" />}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-foreground text-lg leading-tight">{selectedJadwal.nama_outlet}</h4>
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-tight">
                                         <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatTanggal(selectedJadwal.tanggal_instalasi)}</span>
                                         <span className="w-1 h-1 rounded-full bg-stone" />
                                         <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatWaktuWITA(selectedJadwal.pukul_instalasi)}</span>
                                    </div>
                                    {selectedJadwal.no_invoice && (
                                        <div className="pt-1">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground bg-notion-gray px-2 py-1 rounded-md border border-border">
                                                {selectedJadwal.no_invoice}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                           <div className="flex items-center justify-between p-1 bg-secondary rounded-md">
                               <div className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Timezone</div>
                               <Select
                                value={selectedTimezone}
                                onValueChange={setSelectedTimezone}
                              >
                                <SelectTrigger className="w-[180px] h-8 border-0 bg-white shadow-none rounded-md text-[11px] font-bold uppercase focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-md">
                                  <SelectItem value="WIB">WIB (BARAT)</SelectItem>
                                  <SelectItem value="WITA">WITA (TENGAH)</SelectItem>
                                  <SelectItem value="WIT">WIT (TIMUR)</SelectItem>
                                </SelectContent>
                              </Select>
                           </div>

                             <div className="space-y-3">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Choose Template</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedJadwal?.tipe_outlet === "Online" ? (
                                        <>
                                            <TemplateBtn onClick={() => handleGenerateTemplate("online_reminder_awal")} label="Initial Reminder" />
                                            <TemplateBtn onClick={() => handleGenerateTemplate("online_konfirmasi_jadwal")} label="Confirmation" />
                                            <TemplateBtn onClick={() => handleGenerateTemplate("online_h1_reminder")} label="H-1 Reminder" />
                                        </>
                                    ) : (
                                        <>
                                            <TemplateBtn onClick={() => handleGenerateTemplate("offline_reminder_awal")} label="Initial Reminder" />
                                            <TemplateBtn onClick={() => handleGenerateTemplate("offline_konfirmasi_jadwal")} label="Confirmation" />
                                            <TemplateBtn onClick={() => handleGenerateTemplate("offline_h1_reminder")} label="H-1 Reminder" />
                                        </>
                                    )}
                                    <TemplateBtn onClick={() => handleGenerateTemplate("no_respond_cancel")} label="No Response (Cancel)" variant="destructive" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center ml-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Message Preview</Label>
                                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 text-[10px] font-bold text-primary hover:bg-secondary -mr-2 uppercase tracking-tight">
                                    <Copy className="h-3 w-3 mr-1.5" /> Copy Text
                                </Button>
                            </div>
                            <div className="relative">
                                <Textarea
                                    value={generatedMessage}
                                    readOnly
                                    className="min-h-[160px] bg-secondary/10 border-border focus:bg-background focus:border-primary transition-all rounded-md font-mono text-xs leading-relaxed p-4 resize-none shadow-none"
                                    placeholder="Select a template to generate message..."
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    /* EDIT FORM */
                    <form id="edit-form" onSubmit={handleUpdate} className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* DETAILS */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-border mb-4">
                                    <Building className="h-3 w-3 text-muted-foreground" />
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Outlet Info</h4>
                                </div>
                                
                                <FormInput
                                    label="Nama Outlet"
                                    name="nama_outlet"
                                    value={editFormData?.nama_outlet}
                                    onChange={handleEditInputChange}
                                />
                                <FormInput
                                    label="Nama Owner"
                                    name="nama_owner"
                                    value={editFormData?.nama_owner}
                                    onChange={handleEditInputChange}
                                />
                                <FormInput
                                    label="No Telepon"
                                    name="no_telepon"
                                    value={editFormData?.no_telepon}
                                    onChange={handleEditInputChange}
                                />
                                <FormInput
                                    label="No Invoice"
                                    name="no_invoice"
                                    value={editFormData?.no_invoice}
                                    onChange={handleEditInputChange}
                                />
                            </div>

                            {/* CLASSIFICATION & TIMING */}
                            <div className="space-y-6">
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border mb-4">
                                        <Filter className="h-3 w-3 text-muted-foreground" />
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Classification</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tipe Outlet</Label>
                                            <Select
                                                name="tipe_outlet"
                                                value={editFormData?.tipe_outlet}
                                                onValueChange={(v) => handleEditSelectChange("tipe_outlet", v)}
                                            >
                                                <SelectTrigger className="rounded-md border-input bg-background h-10 shadow-none text-sm font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-md">
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
                                    <FormInput
                                        label="SCH Leads"
                                        name="sch_leads"
                                        value={editFormData?.sch_leads}
                                        onChange={handleEditInputChange}
                                    />
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border mb-4">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Schedule</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                         <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tanggal</Label>
                                            <DatePicker
                                                date={editFormData?.tanggal_instalasi}
                                                onSelect={handleEditDateChange}
                                            />
                                         </div>
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Waktu (WITA)</Label>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={editFormData?.pukul_instalasi?.split(":")[0] || "00"}
                                                    onValueChange={(val) => handleEditTimeChange("hour", val)}
                                                >
                                                    <SelectTrigger className="rounded-md border-input bg-background h-10 shadow-none text-sm font-medium"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="max-h-60 rounded-md">
                                                        {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                 <Select
                                                    value={editFormData?.pukul_instalasi?.split(":")[1] || "00"}
                                                    onValueChange={(val) => handleEditTimeChange("minute", val)}
                                                >
                                                    <SelectTrigger className="rounded-md border-input bg-background h-10 shadow-none text-sm font-medium"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-md">
                                                        {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                         </div>
                                    </div>
                                    <FormInput
                                        label="Hari Instalasi"
                                        name="hari_instalasi"
                                        value={editFormData?.hari_instalasi}
                                        onChange={handleEditInputChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border">
                              <FormInput
                                label="Address / Link Meet"
                                name={editFormData?.tipe_outlet === "Online" ? "link_meet" : "alamat"}
                                value={editFormData?.tipe_outlet === "Online" ? editFormData?.link_meet : editFormData?.alamat}
                                onChange={handleEditInputChange}
                                icon={editFormData?.tipe_outlet === "Online" ? <Link2 className="h-3 w-3 text-muted-foreground"/> : <MapPin className="h-3 w-3 text-muted-foreground"/>}
                            />
                        </div>
                    </form>
                )}
            </div>

            <DialogFooter className="p-6 pt-4 border-t border-border bg-secondary/20 flex flex-col sm:flex-row gap-3 sm:justify-between items-center">
                 {isEditing ? (
                     <>
                        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-md text-muted-foreground hover:bg-secondary px-6">Cancel</Button>
                        <Button form="edit-form" type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-md shadow-none px-8 font-semibold">
                            <Save className="h-4 w-4 mr-2" /> Save Changes
                        </Button>
                     </>
                 ) : (
                    <>
                         <div className="flex gap-2">
                             <Button variant="ghost" onClick={handleDelete} className="rounded-md text-semantic-error hover:bg-notion-rose/30 px-3">
                                 <Trash2 className="h-4 w-4" />
                             </Button>
                             <Button variant="outline" onClick={handleEditClick} className="rounded-md border-input text-foreground hover:bg-secondary font-semibold text-xs px-6 h-10">
                                 <Edit className="h-4 w-4 mr-2" /> EDIT INFO
                             </Button>
                         </div>
                        
                         <div className="flex gap-2 text-right w-full sm:w-auto">
                             <Button 
                                 onClick={handleShare}
                                 disabled={!generatedMessage}
                                 variant="outline"
                                 className="rounded-md border-input text-foreground bg-white hover:bg-secondary hidden sm:inline-flex px-6 h-10 font-semibold text-xs"
                             >
                                 <Share2 className="h-4 w-4 mr-2" />
                                 SHARE
                             </Button>
                             <Button 
                                 onClick={sendToWhatsApp} 
                                 disabled={!generatedMessage}
                                 className="bg-brand-green hover:bg-brand-green/90 text-white rounded-md shadow-none font-bold px-8 flex-1 sm:flex-none h-10 text-xs"
                             >
                                 <Send className="h-4 w-4 mr-2" />
                                 SEND WA
                             </Button>
                         </div>
                    </>
                 )}
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
    </div>
  );
}

function TemplateBtn({ onClick, label, variant = "outline" }: any) {
    return (
        <Button
            onClick={onClick}
            variant={variant === "destructive" ? "destructive" : "outline"}
            className={`justify-start h-auto py-3 px-4 rounded-md text-left transition-all border ${
                variant !== "destructive" 
                ? "border-input bg-background hover:bg-secondary hover:text-primary hover:border-primary/30" 
                : "bg-notion-rose text-semantic-error border-notion-rose hover:bg-notion-rose/70"
            }`}
        >
            <span className="text-[11px] font-bold uppercase tracking-tight truncate w-full">{label}</span>
        </Button>
    )
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
    <div className="space-y-1.5 group">
      <Label
        htmlFor={name}
        className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 transition-colors group-hover:text-primary"
      >
        <span className="flex items-center gap-1.5">{icon}{label}</span>
      </Label>
      <Input
        id={name}
        name={name}
        value={value || ""}
        onChange={(e) => onChange(e.target.name, e.target.value)}
        type={type}
        required={required}
        disabled={disabled}
        className="rounded-md border-input bg-background hover:bg-secondary focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-300 h-10 text-sm font-normal shadow-none"
      />
    </div>
  );
}
