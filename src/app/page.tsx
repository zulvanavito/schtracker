"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription, // <-- Import Deskripsi
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Save, Sparkles } from "lucide-react"; // <-- Import Ikon

// Tipe data untuk form kita
interface FormData {
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

const initialFormData: FormData = {
  nama_outlet: "",
  nama_owner: "",
  no_telepon: "",
  no_invoice: "",
  sch_leads: "",
  alamat: "",
  tipe_outlet: "",
  tipe_langganan: "",
  hari_instalasi: "",
  tanggal_instalasi: undefined,
  pukul_instalasi: "",
  link_meet: "",
};

// Opsi untuk dropdown waktu
const hours = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const minutes = ["00", "15", "30", "45"];

export default function Home() {
  const [rawText, setRawText] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // (Semua fungsi handler Anda tetap sama persis)
  // ...
  // handleInputChange
  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  // handleSelectChange
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "tipe_outlet" && value === "Offline" && { link_meet: "" }),
    }));
  };
  // handleDateChange
  const handleDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, tanggal_instalasi: date }));
  };
  // handleTimeChange
  const handleTimeChange = (part: "hour" | "minute", value: string) => {
    const [currentHour = "09", currentMinute = "00"] =
      formData.pukul_instalasi.split(":");
    let newTime: string;
    if (part === "hour") {
      newTime = `${value}:${currentMinute}`;
    } else {
      newTime = `${currentHour}:${value}`;
    }
    setFormData((prev) => ({ ...prev, pukul_instalasi: newTime }));
  };
  // handleParse
  const handleParse = () => {
    const baris = rawText.split("\n");
    const dataTerurai: any = {
      nama_outlet: baris[0] || "",
      nama_owner: baris[1] || "",
      no_telepon: "",
      no_invoice: "",
      sch_leads: "",
      alamat: "",
      tipe_outlet: "",
      tipe_langganan: "",
    };
    try {
      baris.forEach((line) => {
        const lowerLine = line.toLowerCase();
        if (line.match(/(\(08\)|08)\d{8,12}/))
          dataTerurai.no_telepon = line.match(/(\(08\)|08)\d{8,12}/)[0];
        if (line.startsWith("INV/")) dataTerurai.no_invoice = line.trim();
        if (line.startsWith("SCH/")) dataTerurai.sch_leads = line.trim();
        if (line.match(/^(Jl\.|Gg\.|Perumahan|Jalan|F7V2\+7G6)/i))
          dataTerurai.alamat = line.trim();
        if (lowerLine.includes("offline")) dataTerurai.tipe_outlet = "Offline";
        if (lowerLine.includes("online")) dataTerurai.tipe_outlet = "Online";
        if (lowerLine.includes("training berbayar"))
          dataTerurai.tipe_langganan = "Training Berbayar";
        else if (lowerLine.includes("starter basic"))
          dataTerurai.tipe_langganan = "Starter Basic";
        else if (lowerLine.includes("starter"))
          dataTerurai.tipe_langganan = "Starter";
        else if (lowerLine.includes("advance"))
          dataTerurai.tipe_langganan = "Advance";
        else if (lowerLine.includes("prime"))
          dataTerurai.tipe_langganan = "Prime";
      });
      setFormData((prev) => ({
        ...prev,
        ...dataTerurai,
        hari_instalasi: "",
        tanggal_instalasi: undefined,
        pukul_instalasi: "",
        link_meet: dataTerurai.tipe_outlet === "Offline" ? "" : prev.link_meet,
      }));
      toast.success("Data berhasil diurai!", {
        description: "Formulir di sebelah kanan telah terisi.",
      });
    } catch (error: any) {
      toast.error("Gagal mengurai data", { description: error.message });
    }
  };
  // handleSubmit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.tanggal_instalasi) {
      toast.error("Validasi Gagal", {
        description: "Tanggal Instalasi wajib diisi.",
      });
      return;
    }
    if (
      !formData.pukul_instalasi ||
      formData.pukul_instalasi.split(":").length < 2
    ) {
      toast.error("Validasi Gagal", {
        description: "Pukul Instalasi (Jam dan Menit) wajib diisi.",
      });
      return;
    }
    const dataToSend = {
      ...formData,
      tanggal_instalasi: format(formData.tanggal_instalasi, "yyyy-MM-dd"),
    };
    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const response = await fetch("/api/simpan-jadwal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSend),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Gagal menyimpan data");
          setFormData(initialFormData);
          setRawText("");
          resolve(result.data[0]);
        } catch (error) {
          reject(error);
        }
      });
    toast.promise(promise, {
      loading: "Menyimpan data...",
      success: (data: any) => `Data berhasil disimpan! (ID: ${data.id})`,
      error: (err: any) => `Error: ${err.message}`,
    });
  };
  // ...
  // Ambil nilai jam & menit saat ini
  const [currentHour = "", currentMinute = ""] =
    formData.pukul_instalasi.split(":");

  return (
    // Lebarkan max-width untuk layout 2 kolom
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* --- HEADER BARU --- */}
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Parser Jadwal</h1>
          <p className="text-muted-foreground">
            Tempel data mentah, verifikasi, lalu simpan ke database.
          </p>
        </div>
        <div className="flex shrink-0 space-x-2">
          <Button asChild variant="secondary">
            <Link href="/tabel">Lihat Daftar Tabel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jadwal">Lihat Kalender</Link>
          </Button>
        </div>
      </header>

      {/* --- TATA LETAK 2 KOLOM BARU --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8 md:items-start">
        {/* --- KOLOM KIRI (Sticky) --- */}
        <div className="md:sticky md:top-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Langkah 1: Tempel Data Mentah</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={15} // Buat lebih tinggi
                placeholder="Tempel data mentah dari spreadsheet di sini..."
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleParse} className="w-full" size="lg">
                <Sparkles className="mr-2 h-4 w-4" />
                Urai Data
              </Button>
            </CardFooter>
          </Card>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            Data yang diurai akan muncul di formulir di sebelah kanan.
          </p>
        </div>

        {/* --- KOLOM KANAN (Scrolling) --- */}
        <form onSubmit={handleSubmit} className="mt-8 md:mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Langkah 2: Verifikasi & Simpan</CardTitle>
              <CardDescription>
                Periksa data yang diurai, perbaiki jika salah, dan lengkapi
                jadwal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Layout form di-tweak menjadi 'sm:grid-cols-2' */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kolom Kiri Form */}
                <div className="space-y-4">
                  <FormInput
                    label="Nama Outlet"
                    name="nama_outlet"
                    value={formData.nama_outlet}
                    onChange={handleInputChange}
                  />
                  <FormInput
                    label="No Telepon"
                    name="no_telepon"
                    value={formData.no_telepon}
                    onChange={handleInputChange}
                  />
                  <FormInput
                    label="Alamat"
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleInputChange}
                  />
                  <FormInput
                    label="SCH Leads"
                    name="sch_leads"
                    value={formData.sch_leads}
                    onChange={handleInputChange}
                  />
                </div>
                {/* Kolom Kanan Form */}
                <div className="space-y-4">
                  <FormInput
                    label="Nama Owner"
                    name="nama_owner"
                    value={formData.nama_owner}
                    onChange={handleInputChange}
                  />
                  <FormInput
                    label="No Invoice"
                    name="no_invoice"
                    value={formData.no_invoice}
                    onChange={handleInputChange}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="tipe_outlet">Tipe (Online/Offline)</Label>
                    <Select
                      name="tipe_outlet"
                      value={formData.tipe_outlet}
                      onValueChange={(value) =>
                        handleSelectChange("tipe_outlet", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="-- Pilih Tipe --" />
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
                    value={formData.tipe_langganan}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Bagian Jadwal (Layout Grid Baru yang Lebih Aman) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {/* Hari Instalasi (Satu Baris Penuh) */}
                <div className="sm:col-span-2">
                  <FormInput
                    label="Hari Instalasi"
                    name="hari_instalasi"
                    value={formData.hari_instalasi}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Tanggal Instalasi (Setengah Baris) */}
                <div className="space-y-2">
                  <Label>Tanggal Instalasi</Label>
                  <DatePicker
                    date={formData.tanggal_instalasi}
                    onSelect={handleDateChange}
                  />
                </div>

                {/* Pukul Instalasi (Setengah Baris) */}
                <div className="space-y-2">
                  <Label>Pukul Instalasi</Label>
                  <div className="flex gap-2">
                    <Select
                      value={currentHour}
                      onValueChange={(value) => handleTimeChange("hour", value)}
                      required
                    >
                      <SelectTrigger>
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
                      value={currentMinute}
                      onValueChange={(value) =>
                        handleTimeChange("minute", value)
                      }
                      required
                    >
                      <SelectTrigger>
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

              <div className="pt-4">
                <FormInput
                  label="Link Meet"
                  name="link_meet"
                  value={formData.link_meet}
                  onChange={handleInputChange}
                  disabled={formData.tipe_outlet === "Offline"}
                  required={formData.tipe_outlet === "Online"}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" size="lg" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Simpan Jadwal Baru
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}

// Helper komponen FormInput (tetap sama)
interface FormInputProps {
  label: string;
  name: string;
  value: string;
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
