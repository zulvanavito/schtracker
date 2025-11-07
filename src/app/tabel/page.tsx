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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

  const [selectedJadwal, setSelectedJadwal] = useState<Jadwal | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fungsi fetchJadwal
  async function fetchJadwal() {
    setLoading(true);
    try {
      const response = await fetch("/api/get-jadwal");
      if (!response.ok) throw new Error("Gagal mengambil data jadwal");
      const dataJadwal: Jadwal[] = await response.json();
      setJadwalList(dataJadwal);
    } catch (err: any) {
      toast.error("Gagal mengambil data", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJadwal();
  }, []);

  // Fungsi Generate Template & Simpan Log
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

    // (Template lengkap Anda)
    switch (type) {
      case "online_reminder_awal":
        template = `Halo majoopreneurs!\nPerkenalkan saya dari Team Scheduler Majoo. Melalui pesan ini, saya ingin menginformasikan jadwal instalasi perangkat dan sesi training aplikasi Majoo oleh tim Customer Support Majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\n\nSeluruh rangkaian aktivitas akan dilakukan secara ONLINE melalui Google Meet.\nMohon konfirmasinya apakah BERSEDIA/TIDAK sesuai waktu diatas, Terima kasih\n\nSilakan melakukan konfirmasi dalam 1x12 jam dengan membalas pesan ini. Di luar itu, maka jadwal training dianggap batal. Penjadwalan ulang dapat dilakukan dengan menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only).`;
        break;
      case "online_konfirmasi_jadwal":
        template = `Halo majoopreneurs!\nTerima kasih telah melakukan konfirmasi jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nLink Google Meet : ${link_meet}\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nPerubahan jadwal dapat dilakukan selambat-latnya dalam 2x24 jam. Di luar itu, akan dikenakan biaya tambahan sebesar Rp50.000. Training tambahan dapat dilakukan dengan membeli sesi training sebesar Rp250.000/sesi selama 3 Jam. Untuk permintaan penjadwalan ulang, kakak dapat menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only). Terima kasih, Have a nice day ^^`;
        break;
      case "online_h1_reminder":
        template = `Halo majoopreneurs!\nIzin melakukan reminder jadwal instalasi perangkat dan sesi training aplikasi majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nLink Google Meet : ${link_meet}\n\nSebelum menjalani sesi training, berikut hal-hal yang perlu diperhatikan:\n✅ Tim majoo akan menjelaskan fitur lengkap yang ada di aplikasi majoo\n✅ Dipersilakan untuk bertanya jika terdapat informasi yang belum jelas\n\nKami berharap sesi dapat dimulai tepat waktu, karena kami akan mulai sesuai dengan jadwal yang ditentukan. Waktu training akan terhitung dari jadwal dan jam yang sudah terkonfirmasi. Keterlambatan sesi training tidak mendapatkan jam tambahan dikarenakan kami sudah memiliki jadwal ke merchant lainnya.\n\nMohon untuk mempersiapkan data berikut untuk mempermudah proses registrasi saat sesi training berlangsung:\n✅ KTP\n✅ NPWP\n✅ Nomor Rekening Settlement\n\nTerima kasih, Have a nice day!`;
        break;
      case "offline_reminder_awal":
        template = `Halo majoopreneurs!\nPerkenalkan saya dari Team Scheduler Majoo. Melalui pesan ini, saya ingin menginformasikan jadwal instalasi perangkat dan sesi training aplikasi Majoo oleh tim Customer Support Majoo pada:\n\nHari : ${hari_instalasi}\nTanggal : ${tanggalFormatted}\nPukul : ${pukul_instalasi}\nOutlet : ${nama_outlet}\nAlamat : ${alamat}\n\nMohon konfirmasinya apakah BERSEDIA/TIDAK sesuai waktu diatas, Terima kasih\n\nSilakan melakukan konfirmasi dalam 1x12 jam dengan membalas pesan ini. Di luar itu, maka jadwal training dianggap batal. Penjadwalan ulang dapat dilakukan dengan menghubungi nomor ini atau hotline majoo di 0811500460 (Chat WA Only).`;
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

    // Simpan Log
    try {
      const response = await fetch("/api/simpan-log-pesan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jadwal_id: selectedJadwal.id,
          tipe_pesan: type,
          isi_pesan: template,
        }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan log pesan");
      toast.success("Template dibuat dan berhasil disimpan ke log.");
    } catch (error: any) {
      toast.error("Gagal menyimpan log", { description: error.message });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success("Template berhasil disalin ke clipboard!");
  };

  const openModal = (jadwal: Jadwal) => {
    setSelectedJadwal(jadwal);
    setGeneratedMessage("");
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daftar Semua Jadwal</h1>
        <div className="space-x-2">
          <Button asChild variant="outline">
            <Link href="/jadwal">Lihat Kalender</Link>
          </Button>
          <Button asChild>
            <Link href="/">+ Tambah Jadwal Baru</Link>
          </Button>
        </div>
      </header>
      <p className="mb-4">
        Total jadwal tersimpan: <b>{jadwalList.length}</b>
      </p>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aksi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Nama Outlet</TableHead>
                <TableHead>SCH Leads</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Langganan</TableHead>
                <TableHead>No. Telepon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : jadwalList.length > 0 ? (
                jadwalList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openModal(item)}
                        >
                          Buat Pesan
                        </Button>
                      </DialogTrigger>
                    </TableCell>
                    <TableCell>{item.tanggal_instalasi}</TableCell>
                    <TableCell>{item.pukul_instalasi}</TableCell>
                    <TableCell className="font-medium">
                      {item.nama_outlet}
                    </TableCell>
                    <TableCell>{item.sch_leads}</TableCell>
                    <TableCell>{item.tipe_outlet}</TableCell>
                    <TableCell>{item.tipe_langganan}</TableCell>
                    <TableCell>{item.no_telepon}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Belum ada data jadwal.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal Content */}
        {selectedJadwal && (
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Buat Template Pesan</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Membuat pesan untuk:{" "}
                <strong>{selectedJadwal.nama_outlet}</strong> (Tipe:{" "}
                {selectedJadwal.tipe_outlet})
              </p>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Tombol Dinamis */}
              {selectedJadwal.tipe_outlet === "Online" && (
                <div>
                  <h4 className="font-semibold mb-2">Template ONLINE</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("online_reminder_awal")
                      }
                    >
                      1. Reminder Awal
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("online_konfirmasi_jadwal")
                      }
                    >
                      2. Konfirmasi Jadwal
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("online_h1_reminder")
                      }
                    >
                      3. H-1 Reminder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("no_respond_cancel")
                      }
                    >
                      4. No Respond / Cancel
                    </Button>
                  </div>
                </div>
              )}
              {selectedJadwal.tipe_outlet === "Offline" && (
                <div>
                  <h4 className="font-semibold mb-2">Template OFFLINE</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("offline_reminder_awal")
                      }
                    >
                      1. Reminder Awal
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("offline_konfirmasi_jadwal")
                      }
                    >
                      2. Konfirmasi Jadwal
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("offline_h1_reminder")
                      }
                    >
                      3. H-1 Reminder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleGenerateTemplate("no_respond_cancel")
                      }
                    >
                      4. No Respond / Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Hasil Template Pesan:</Label>
              <Textarea
                value={generatedMessage}
                readOnly
                rows={15}
                placeholder="Template pesan akan muncul di sini..."
              />
            </div>

            <DialogFooter>
              <Button onClick={copyToClipboard} disabled={!generatedMessage}>
                Salin Teks Template
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
