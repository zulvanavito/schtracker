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
import { Textarea } from "@/components/ui/textarea";
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
  MapPin,
  User,
  Link2,
  CheckCircle2,
  Sparkles,
  Send,
  Filter,
} from "lucide-react";

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

// Helper format tanggal
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

export default function HalamanTabel() {
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [filterTipe, setFilterTipe] = useState<string>("semua");

  const [selectedJadwal, setSelectedJadwal] = useState<Jadwal | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Filter jadwal berdasarkan tipe
  const filteredJadwal = jadwalList.filter((jadwal) => {
    if (filterTipe === "semua") return true;
    return jadwal.tipe_outlet === filterTipe;
  });

  // Fungsi untuk memeriksa dan refresh session
  const checkAndRefreshSession = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        return null;
      }

      // Jika session ada tapi token hampir expired, refresh
      if (session) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
        const now = Date.now();

        // Refresh jika token akan expired dalam 5 menit
        if (expiresAt && expiresAt - now < 5 * 60 * 1000) {
          console.log("Token hampir expired, refreshing...");
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          if (refreshError) {
            console.error("Refresh error:", refreshError);
            return null;
          }

          return refreshData.session;
        }

        return session;
      }

      return null;
    } catch (error) {
      console.error("Error checking session:", error);
      return null;
    }
  };

  // Fungsi fetchJadwal
  async function fetchJadwal() {
    setLoading(true);
    try {
      const response = await fetch("/api/get-jadwal", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (!response.ok) throw new Error("Gagal mengambil data jadwal");
      const dataJadwal: Jadwal[] = await response.json();
      setJadwalList(dataJadwal);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errorMessage);
      toast.error("Gagal mengambil data", { description: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Check session pertama kali
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
    setIsModalOpen(true);
  };

  const handleGenerateTemplate = async (type: string) => {
    if (!selectedJadwal) return;

    let template = "";
    const {
      hari_instalasi,
      tanggal_instalasi,
      pukul_instalasi,
      nama_outlet,
      link_meet,
      alamat,
    } = selectedJadwal;
    const tanggalFormatted = formatTanggal(tanggal_instalasi);

    switch (type) {
      case "online_reminder_awal":
        template = `Halo majoopreneurs!\nPerkenalkan saya dari Team Scheduler Majoo. Melalui pesan ini, saya ingin menginformasikan jadwal instalasi perangkat dan sesi training aplikasi Majoo oleh tim Customer Support Majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\n\nSeluruh rangkaian aktivitas akan dilakukan secara ONLINE melalui Google Meet.\nMohon konfirmasinya apakah BERSEDIA/TIDAK sesuai waktu diatas, Terima kasih\n\nSilakan melakukan konfirmasi dalam 1x12 jam dengan membalas pesan ini. Di luar itu, maka jadwal training dianggap batal. Penjadwal ulang dapat dilakukan dengan menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only).`;
        break;
      case "online_konfirmasi_jadwal":
        template = `Halo majoopreneurs!\nTerima kasih telah melakukan konfirmasi jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nLink Google Meet : ${link_meet}\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nPerubahan jadwal dapat dilakukan selambat-latnya dalam 2x24 jam. Di luar itu, akan dikenakan biaya tambahan sebesar Rp50.000. Training tambahan dapat dilakukan dengan membeli sesi training sebesar Rp250.000/sesi selama 3 Jam. Untuk permintaan penjadwalan ulang, kakak dapat menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only). Terima kasih, Have a nice day ^^`;
        break;
      case "online_h1_reminder":
        template = `Halo majoopreneurs!\nIzin melakukan reminder jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nLink Google Meet : ${link_meet}\n\nSebelum menjalani sesi training, berikut hal-hal yang perlu diperhatikan:\n✅ Tim majoo akan menjelaskan fitur lengkap yang ada di aplikasi majoo\n✅ Dipersilakan untuk bertanya jika terdapat informasi yang belum jelas\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nTerima kasih, Have a nice day!`;
        break;
      case "offline_reminder_awal":
        template = `Halo majoopreneurs!\nPerkenalkan saya dari Team Scheduler Majoo. Melalui pesan ini, saya ingin menginformasikan jadwal instalasi perangkat dan sesi training aplikasi Majoo oleh tim Customer Support Majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nAlamat : ${alamat}\n\nMohon konfirmasinya apakah BERSEDIA/TIDAK sesuai waktu diatas, Terima kasih\n\nSilakan melakukan konfirmasi dalam 1x12 jam dengan membalas pesan ini. Di luar itu, maka jadwal training dianggap batal. Penjadwal ulang dapat dilakukan dengan menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only).`;
        break;
      case "offline_konfirmasi_jadwal":
        template = `Halo majoopreneurs!\nTerima kasih telah melakukan konfirmasi jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nAlamat : ${alamat}\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nPerubahan jadwal dapat dilakukan selambat-latnya dalam 2x24 jam. Di luar itu, akan dikenakan biaya tambahan sebesar Rp50.000. Training tambahan dapat dilakukan dengan membeli sesi training sebesar Rp250.000/sesi selama 3 Jam. Untuk permintaan penjadwalan ulang, kakak dapat menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only). Terima kasih, Have a nice day ^^`;
        break;
      case "offline_h1_reminder":
        template = `Halo majoopreneurs!\nIzin melakukan reminder jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nAlamat : ${alamat}\n\nSebelum menjalani sesi training, berikut hal-hal yang perlu diperhatikan:\n✅ Tim majoo akan menjelaskan fitur lengkap yang ada di aplikasi majoo\n✅ Dipersilakan untuk bertanya jika terdapat informasi yang belum jelas\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nTerima kasih, Have a nice day!`;
        break;
      case "no_respond_cancel":
        template = `Halo majooprenuers!\nDikarenakan tidak ada konfirmasi lagi dari penjadwal training, mohon maaf untuk tiket penjadwalan diatas kami tutup. Jika Kakak sudah siap dan bersedia untuk melakukan training silakan Chat dan konfirmasi kembali ke nomor ini atau Whatsapp Hotline kami di 0811500460 dan bisa juga menghubungi kami di 1500460 dengan estimasi waktu H-7 dari tanggal request training, terima kasih`;
        break;
      default:
        template = "Silakan pilih template...";
    }

    setGeneratedMessage(template);

    try {
      // Refresh session sebelum mengirim request
      const session = await checkAndRefreshSession();

      if (!session) {
        throw new Error("Session tidak valid. Silakan login ulang.");
      }

      setMessage("Membuat template dan menyimpan ke log...");

      const response = await fetch("/api/simpan-log-pesan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jadwal_id: selectedJadwal.id,
          tipe_pesan: type,
          isi_pesan: template,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gagal menyimpan log pesan");
      }

      toast.success("Template dibuat dan berhasil disimpan ke log.");
      setMessage("");

      // Refresh data untuk menampilkan log terbaru
      fetchJadwal();
    } catch (error: unknown) {
      console.error("Error saving log:", error);
      let errorMessage = "Gagal menyimpan log";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error("Gagal menyimpan log", { description: errorMessage });
      setMessage("");
    }
  };

  const sendToWhatsApp = () => {
    if (!selectedJadwal?.no_telepon || !generatedMessage) {
      toast.error("Nomor telepon atau pesan tidak tersedia");
      return;
    }

    const phoneNumber = selectedJadwal.no_telepon.replace(/\D/g, "");

    const encodedMessage = encodeURIComponent(generatedMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");

    toast.success("Membuka WhatsApp...");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success("Template berhasil disalin ke clipboard!");
  };

  // Tampilkan loading
  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">Memuat daftar jadwal...</p>
        </div>
      </div>
    );
  }

  // Tampilkan error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md">
            <p className="text-red-600 font-medium">Error: {error}</p>
            <Button onClick={fetchJadwal} className="mt-4">
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Daftar Jadwal
                </h1>
                <p className="text-muted-foreground text-lg">
                  Kelola dan kirim pesan untuk semua jadwal instalasi
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/jadwal">
                <Calendar className="h-4 w-4" />
                Kalender
              </Link>
            </Button>
            <Button
              asChild
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Link href="/">
                <Sparkles className="h-4 w-4" />
                Tambah Jadwal
              </Link>
            </Button>
            <AuthButton />
          </div>
        </header>

        {/* Stats dan Filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Jadwal</p>
                <p className="text-2xl font-bold text-slate-800">
                  {jadwalList.length}
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
                  {jadwalList.filter((j) => j.tipe_outlet === "Online").length}
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
                  {jadwalList.filter((j) => j.tipe_outlet === "Offline").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Filter className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filter Tipe</p>
                <select
                  value={filterTipe}
                  onChange={(e) => setFilterTipe(e.target.value)}
                  className="bg-transparent border-0 p-0 font-bold text-slate-800 text-lg focus:outline-none focus:ring-0"
                >
                  <option value="semua">Semua</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-0 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Daftar Semua Jadwal ({filteredJadwal.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="font-semibold">Aksi</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Tanggal
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Waktu
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      Outlet
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">SCH Leads</TableHead>
                  <TableHead className="font-semibold">Tipe</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Link2 className="h-4 w-4" />
                      Link Meet
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Telepon
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJadwal.length > 0 ? (
                  filteredJadwal.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(item)}
                          className="gap-2 rounded-xl"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Pesan
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatTanggal(item.tanggal_instalasi)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {item.pukul_instalasi}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800">
                            {item.nama_outlet}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {item.nama_owner}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          {item.sch_leads}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.tipe_outlet === "Online"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {item.tipe_outlet}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.link_meet ? (
                          <a
                            href={item.link_meet}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            <Link2 className="h-4 w-4" />
                            Buka Meet
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{item.no_telepon}</span>
                          {item.log_pesan && item.log_pesan.length > 0 && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              {item.log_pesan.length} pesan
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="space-y-3">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                        <div>
                          <p className="text-muted-foreground font-medium">
                            {filterTipe === "semua"
                              ? "Belum ada data jadwal."
                              : `Tidak ada jadwal dengan tipe ${filterTipe}.`}
                          </p>
                          <Button
                            asChild
                            variant="outline"
                            className="mt-2 gap-2"
                          >
                            <Link href="/">
                              <Sparkles className="h-4 w-4" />
                              Tambah Jadwal Baru
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modal Buat Pesan */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          {selectedJadwal && (
            <DialogContent className="sm:max-w-4xl rounded-2xl border-0 shadow-2xl">
              <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-6 rounded-t-2xl">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Buat Template Pesan
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Membuat pesan untuk:{" "}
                  <strong>{selectedJadwal.nama_outlet}</strong> • Tipe:{" "}
                  <span
                    className={`font-medium ${
                      selectedJadwal.tipe_outlet === "Online"
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {selectedJadwal.tipe_outlet}
                  </span>{" "}
                  • Telepon: <strong>{selectedJadwal.no_telepon}</strong>
                </p>
              </DialogHeader>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Template Selection */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2 text-slate-700">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    Pilih Template Pesan
                  </h4>

                  {selectedJadwal.tipe_outlet === "Online" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TemplateButton
                        title="Reminder Awal"
                        description="Pengenalan dan konfirmasi awal"
                        onClick={() =>
                          handleGenerateTemplate("online_reminder_awal")
                        }
                        variant="outline"
                      />
                      <TemplateButton
                        title="Konfirmasi Jadwal"
                        description="Setelah merchant konfirmasi"
                        onClick={() =>
                          handleGenerateTemplate("online_konfirmasi_jadwal")
                        }
                        variant="outline"
                      />
                      <TemplateButton
                        title="H-1 Reminder"
                        description="Pengingat sehari sebelum"
                        onClick={() =>
                          handleGenerateTemplate("online_h1_reminder")
                        }
                        variant="outline"
                      />
                      <TemplateButton
                        title="No Respond / Cancel"
                        description="Jika tidak ada konfirmasi"
                        onClick={() =>
                          handleGenerateTemplate("no_respond_cancel")
                        }
                        variant="outline"
                      />
                    </div>
                  )}

                  {selectedJadwal.tipe_outlet === "Offline" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TemplateButton
                        title="Reminder Awal"
                        description="Pengenalan dan konfirmasi awal"
                        onClick={() =>
                          handleGenerateTemplate("offline_reminder_awal")
                        }
                        variant="outline"
                      />
                      <TemplateButton
                        title="Konfirmasi Jadwal"
                        description="Setelah merchant konfirmasi"
                        onClick={() =>
                          handleGenerateTemplate("offline_konfirmasi_jadwal")
                        }
                        variant="outline"
                      />
                      <TemplateButton
                        title="H-1 Reminder"
                        description="Pengingat sehari sebelum"
                        onClick={() =>
                          handleGenerateTemplate("offline_h1_reminder")
                        }
                        variant="outline"
                      />
                      <TemplateButton
                        title="No Respond / Cancel"
                        description="Jika tidak ada konfirmasi"
                        onClick={() =>
                          handleGenerateTemplate("no_respond_cancel")
                        }
                        variant="outline"
                      />
                    </div>
                  )}
                </div>

                {/* Generated Message */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    Hasil Template Pesan:
                  </Label>
                  <Textarea
                    value={generatedMessage}
                    readOnly
                    rows={12}
                    placeholder="Template pesan akan muncul di sini..."
                    className="rounded-xl border-2 focus:border-blue-300 transition-colors resize-none"
                  />
                </div>

                {message && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {message}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="bg-slate-50/50 border-t p-6 rounded-b-2xl gap-3">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={copyToClipboard}
                    disabled={!generatedMessage}
                    variant="outline"
                    className="gap-2 rounded-xl"
                  >
                    <Copy className="h-4 w-4" />
                    Salin Teks
                  </Button>
                  <Button
                    onClick={sendToWhatsApp}
                    disabled={!generatedMessage || !selectedJadwal?.no_telepon}
                    className="gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    Kirim WhatsApp
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}

// Komponen Template Button
interface TemplateButtonProps {
  title: string;
  description: string;
  onClick: () => void;
  variant?: "default" | "outline";
}

function TemplateButton({
  title,
  description,
  onClick,
  variant = "default",
}: TemplateButtonProps) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className="h-auto py-4 px-4 justify-start text-left rounded-xl border-2 hover:border-blue-300 transition-all"
    >
      <div className="space-y-1">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </Button>
  );
}
