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
  MapPin
} from "lucide-react";
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

// Stats Card Component
function StatCard({ icon, label, value, color, delay }: any) {
    return (
      <div className={`glass-card p-5 flex items-center gap-4 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${delay}`}>
        <div className={`p-3 rounded-2xl ${color} ring-1 ring-white/50 shadow-sm`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-extrabold text-slate-800">{value}</p>
        </div>
      </div>
    );
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-slate-100 bg-slate-50/30">
      <div className="text-sm font-medium text-slate-500">
        Showing <span className="text-slate-800">{startItem}-{endItem}</span> of <span className="text-slate-800">{totalItems}</span> schedules
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="gap-1 rounded-xl glass-button h-8 px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>

        <div className="flex items-center gap-1">
            {/* Simple pagination logic for brevity in this redesign */}
             <span className="bg-white px-3 py-1 rounded-lg border text-sm font-semibold shadow-sm">
                Page {currentPage} of {totalPages}
             </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="gap-1 rounded-xl glass-button h-8 px-3"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function HalamanTabel() {
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [filterTipe, setFilterTipe] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"terbaru" | "tanggal">("terbaru");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [selectedJadwal, setSelectedJadwal] = useState<Jadwal | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);

  const handleEditClick = () => {
    if (!selectedJadwal) return;
    setEditFormData({
      ...selectedJadwal,
      tanggal_instalasi: new Date(selectedJadwal.tanggal_instalasi),
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
    if (!editFormData || !editFormData.tanggal_instalasi) return;

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
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(dataToSend),
          });

          if (!response.ok) throw new Error("Update failed");

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
            console.error(err);
          reject(err);
        }
      });

    toast.promise(promise(), {
      loading: "Updating...",
      success: "Schedule updated successfully!",
      error: "Failed to update schedule",
    });
  };

  const filteredJadwal = Array.isArray(jadwalList)
    ? jadwalList.filter((jadwal) => {
        if (filterTipe !== "semua" && jadwal.tipe_outlet !== filterTipe) {
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
  }, [filterTipe, searchQuery, sortBy]);

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
    const waktuFormatted = formatWaktuWITA(pukul_instalasi);

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
      fetchJadwal();
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
    <div className="min-h-screen bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-blue-50 p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-10">
          <div className="space-y-4">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 ring-4 ring-blue-50">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
                  Data Management
                </h1>
                <p className="text-slate-500 text-lg font-medium">
                  Manage all installation records and communications
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <Button
              asChild
              className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600"
            >
              <Link href="/jadwal">
                <Calendar className="h-4 w-4" />
                Calendar View
              </Link>
            </Button>
            <Button
              asChild
              className="gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 text-white font-semibold transition-all"
            >
              <Link href="/">
                <Sparkles className="h-4 w-4" />
                New Schedule
              </Link>
            </Button>
            <div className="pl-3 border-l border-slate-200">
              <AuthButton />
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
           <StatCard
            icon={<FileText className="h-5 w-5 text-indigo-600" />}
            label="Total Records"
            value={Array.isArray(jadwalList) ? jadwalList.length : 0}
            color="bg-indigo-50 text-indigo-600"
            delay="delay-0"
           />
           <StatCard
            icon={<MonitorPlay className="h-5 w-5 text-emerald-600" />}
            label="Online"
            value={Array.isArray(jadwalList) ? jadwalList.filter((j) => j.tipe_outlet === "Online").length : 0}
            color="bg-emerald-50 text-emerald-600"
            delay="delay-75"
           />
           <StatCard
            icon={<Map className="h-5 w-5 text-amber-600" />}
            label="Offline"
            value={Array.isArray(jadwalList) ? jadwalList.filter((j) => j.tipe_outlet === "Offline").length : 0}
            color="bg-amber-50 text-amber-600"
            delay="delay-100"
           />
            {/* Custom Filter Card */}
           <div className="glass-card p-5 flex flex-col justify-center gap-2 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg delay-150 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Filter className="w-16 h-16 text-purple-600" />
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-1">
                    <Filter className="h-4 w-4" />
                    <span>Quick Filter</span>
                </div>
                <select
                  value={filterTipe}
                  onChange={(e) => setFilterTipe(e.target.value)}
                  className="bg-transparent border-0 p-0 text-xl font-bold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer w-full"
                >
                    <option value="semua">All Types</option>
                    <option value="Online">Online Only</option>
                    <option value="Offline">Offline Only</option>
                </select>
           </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
            <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                type="text"
                placeholder="Search outlet, owner, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                />
            </div>
            
            <div className="flex gap-3">
                 <div className="relative inline-block">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                         className="appearance-none pl-4 pr-10 py-3 rounded-xl border-slate-200 bg-white/80 backdrop-blur-sm font-medium text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 cursor-pointer shadow-sm transition-all"
                    >
                        <option value="terbaru">Sort: Newest</option>
                        <option value="tanggal">Sort: Date</option>
                    </select>
                    <ArrowUpDown className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                 </div>

                 <Button
                  onClick={fetchJadwal}
                  variant="outline"
                  size="icon"
                  className="h-[46px] w-[46px] rounded-xl glass-button text-slate-600 border-slate-200"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
            </div>
        </div>

        {/* Data Table */}
        <div className="glass-card border-0 overflow-hidden shadow-xl ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="w-[180px] font-bold text-slate-500 uppercase text-xs tracking-wider py-5 pl-6">Actions</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-wider">Date & Time</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-wider">Details</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-wider">Classification</TableHead>
                   <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-wider">Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((jadwal) => (
                    <TableRow key={jadwal.id} className="border-b border-slate-50 group hover:bg-blue-50/30 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <Button
                            onClick={() => openModal(jadwal)}
                            size="sm"
                            className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all font-medium text-xs px-4"
                        >
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />
                            Send MSG
                        </Button>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {formatTanggal(jadwal.tanggal_instalasi)}
                            </span>
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {formatWaktuWITA(jadwal.pukul_instalasi)}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                         <div className="flex flex-col gap-1">
                             <span className="font-bold text-slate-800">{jadwal.nama_outlet}</span>
                              <div className="flex gap-2">
                                {jadwal.no_invoice && (
                                     <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        {jadwal.no_invoice}
                                    </span>
                                )}
                                 <a 
                                    href={formatSchLeadsToUrl(jadwal.sch_leads) || "#"}
                                    target="_blank"
                                    className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded hover:underline cursor-pointer"
                                 >
                                    {jadwal.sch_leads?.replace("SCH/LEADS/", "")}
                                </a>
                              </div>
                         </div>
                      </TableCell>
                       <TableCell className="py-4">
                        <div className="flex flex-col items-start gap-1.5">
                             <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                jadwal.tipe_outlet === "Online" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : "bg-amber-50 text-amber-600 border-amber-100"
                             }`}>
                                {jadwal.tipe_outlet}
                            </span>
                             <span className="text-xs font-semibold text-slate-600">
                                {jadwal.tipe_langganan}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1 text-sm">
                             <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-700 font-medium">{jadwal.nama_owner}</span>
                             </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-500 font-mono text-xs">{jadwal.no_telepon}</span>
                             </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                     <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center opacity-50">
                            <FileText className="h-12 w-12 text-slate-300 mb-2" />
                            <p className="font-medium text-slate-500">No schedules found</p>
                        </div>
                     </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredJadwal.length}
                itemsPerPage={itemsPerPage}
            />
        </div>
      </div>

       {/* Message Modal */}
       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col rounded-2xl border-0 shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl ring-1 ring-black/5">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between flex-shrink-0">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                    <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                        {isEditing ? <Edit className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                    </div>
                   {isEditing ? "Edit Schedule" : "Send Message"}
                </DialogTitle>
                <div className="w-8" /> 
            </DialogHeader>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {!isEditing ? (
                    /* Default VIEW: Message Templates */
                    <>
                        {selectedJadwal && (
                            <div className="relative p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-4">
                                <div className={`p-2 rounded-lg ${selectedJadwal.tipe_outlet === "Online" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                                    {selectedJadwal.tipe_outlet === "Online" ? <MonitorPlay className="h-5 w-5" /> : <Map className="h-5 w-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800">{selectedJadwal.nama_outlet}</h4>
                                        {selectedJadwal.no_invoice && (
                                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                                {selectedJadwal.no_invoice}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">{formatTanggal(selectedJadwal.tanggal_instalasi)} • {formatWaktuWITA(selectedJadwal.pukul_instalasi)}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Choose Template</Label>
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

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message Preview</Label>
                                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 text-xs text-blue-600 hover:bg-blue-50">
                                    <Copy className="h-3 w-3 mr-1" /> Copy
                                </Button>
                            </div>
                            <Textarea
                                value={generatedMessage}
                                readOnly
                                className="min-h-[150px] bg-slate-50/50 border-slate-200 focus:bg-white transition-colors rounded-xl font-mono text-sm leading-relaxed p-3"
                                placeholder="Select a template to generate message..."
                            />
                        </div>
                    </>
                ) : (
                    /* EDIT FORM */
                    <form id="edit-form" onSubmit={handleUpdate} className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* DETAILS */}
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
                                <FormInput
                                    label="No Invoice"
                                    name="no_invoice"
                                    value={editFormData?.no_invoice}
                                    onChange={handleEditInputChange}
                                    icon={<FileText className="h-4 w-4" />}
                                />
                            </div>

                            {/* CLASSIFICATION */}
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

                        {/* TIMING */}
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
                                       <Calendar className="h-4 w-4 text-emerald-500" /> Tanggal
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
                                            value={editFormData?.pukul_instalasi?.split(":")[0] || "00"}
                                            onValueChange={(val) => handleEditTimeChange("hour", val)}
                                        >
                                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50"><SelectValue /></SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                         <Select
                                            value={editFormData?.pukul_instalasi?.split(":")[1] || "00"}
                                            onValueChange={(val) => handleEditTimeChange("minute", val)}
                                        >
                                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                 </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                              <FormInput
                                label="Alamat / Link Meet"
                                name={editFormData?.tipe_outlet === "Online" ? "link_meet" : "alamat"}
                                value={editFormData?.tipe_outlet === "Online" ? editFormData?.link_meet : editFormData?.alamat}
                                onChange={handleEditInputChange}
                                icon={editFormData?.tipe_outlet === "Online" ? <Link2 className="h-4 w-4"/> : <MapPin className="h-4 w-4"/>}
                            />
                        </div>
                    </form>
                )}
            </div>

            <DialogFooter className="p-6 pt-2 border-t border-slate-100 bg-slate-50/30 gap-3 sm:justify-between">
                 {isEditing ? (
                     <>
                        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl text-slate-500">Back</Button>
                        <Button form="edit-form" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
                            <Save className="h-4 w-4 mr-2" /> Save Changes
                        </Button>
                     </>
                 ) : (
                    <>
                         <div className="flex gap-2">
                             <Button variant="ghost" onClick={handleDelete} className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600">
                                 <Trash2 className="h-4 w-4" />
                             </Button>
                             <Button variant="outline" onClick={handleEditClick} className="rounded-xl border-slate-200 text-slate-700">
                                 <Edit className="h-4 w-4 mr-2" /> Edit
                             </Button>
                         </div>
                        
                         <div className="flex gap-2 text-right">
                             <Button 
                                 onClick={handleShare}
                                 disabled={!generatedMessage}
                                 variant="outline"
                                 className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hidden sm:inline-flex"
                             >
                                 <Share2 className="h-4 w-4 mr-2" />
                                 Share
                             </Button>
                             <Button 
                                 onClick={sendToWhatsApp} 
                                 disabled={!generatedMessage}
                                 className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl shadow-lg shadow-green-500/20 font-semibold"
                             >
                                 <Send className="h-4 w-4 mr-2" />
                                 WhatsApp Direct
                             </Button>
                         </div>
                    </>
                 )}
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
  );
}

function TemplateBtn({ onClick, label, variant = "outline" }: any) {
    return (
        <Button
            onClick={onClick}
            variant={variant === "destructive" ? "destructive" : "outline"}
            className={`justify-start h-auto py-3 px-4 rounded-xl text-left ${variant !== "destructive" ? "border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"} transition-all`}
        >
            <span className="text-sm font-medium truncate w-full">{label}</span>
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
