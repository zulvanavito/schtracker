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
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Save, Sparkles } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/lib/supabaseClient";

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

// Tipe data untuk dikirim ke API
interface ApiFormData extends Omit<FormData, "tanggal_instalasi"> {
  tanggal_instalasi: string;
  google_access_token?: string;
}

// Tipe data untuk hasil parsing
interface ParsedData {
  nama_outlet: string;
  nama_owner: string;
  no_telepon: string;
  no_invoice: string;
  sch_leads: string;
  alamat: string;
  tipe_outlet: string;
  tipe_langganan: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // handleFormChange untuk Input, Textarea
  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // handleFormChange khusus untuk Select
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
    const dataTerurai: ParsedData = {
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
          dataTerurai.no_telepon = line.match(/(\(08\)|08)\d{8,12}/)?.[0] || "";
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Gagal mengurai data", { description: errorMessage });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validasi form
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

      // Dapatkan session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        throw new Error("Gagal mendapatkan session: " + sessionError.message);
      }

      if (!session) {
        throw new Error("Anda belum login. Silakan login terlebih dahulu.");
      }

      // DEBUG: Log session info
      console.log("🔑 Session Info untuk Create:", {
        hasSession: !!session,
        user: session.user?.email,
        hasAccessToken: !!session.access_token,
        hasProviderToken: !!session.provider_token,
        appMetadata: session.user?.app_metadata,
      });

      // Siapkan data untuk dikirim
      const dataToSend: ApiFormData = {
        ...formData,
        tanggal_instalasi: format(formData.tanggal_instalasi, "yyyy-MM-dd"),
      };

      // SELALU kirim google_access_token jika tersedia
      if (session.provider_token) {
        dataToSend.google_access_token = session.provider_token;
        console.log("✅ Mengirim google_access_token untuk create");
      } else {
        console.warn("⚠️ Provider token tidak tersedia untuk create");
      }

      // DEBUG: Log data yang dikirim
      console.log("📤 Data yang dikirim ke API simpan-jadwal:", {
        tipe_outlet: formData.tipe_outlet,
        hasGoogleAccessToken: !!dataToSend.google_access_token,
      });

      // Kirim request ke API
      const response = await fetch("/api/simpan-jadwal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Server error:", result);
        throw new Error(
          result.error || `Gagal menyimpan data (${response.status})`
        );
      }

      // Reset form jika sukses
      setFormData(initialFormData);
      setRawText("");

      toast.success("Berhasil!", {
        description: `Jadwal berhasil disimpan! Link Meet: ${
          result.data?.link_meet || "Tidak tersedia"
        }`,
      });
    } catch (error: unknown) {
      console.error("❌ Error dalam handleSubmit:", error);

      let errorMessage = "Terjadi kesalahan yang tidak diketahui";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMessage = "Sesi login telah berakhir. Silakan login ulang.";
        } else if (error.message.includes("Google access token")) {
          errorMessage =
            "Token Google tidak tersedia. Pastikan login dengan Google OAuth.";
        }
      }

      toast.error("Gagal menyimpan data", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [currentHour = "", currentMinute = ""] =
    formData.pukul_instalasi.split(":");

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Parser Jadwal</h1>
          <p className="text-muted-foreground">
            Tempel data mentah, verifikasi, lalu simpan ke database.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/tabel">Daftar Tabel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jadwal">Kalender</Link>
          </Button>
          <AuthButton />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8 md:items-start">
        <div className="md:sticky md:top-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Langkah 1: Tempel Data Mentah</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={15}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="sm:col-span-2">
                  <FormInput
                    label="Hari Instalasi"
                    name="hari_instalasi"
                    value={formData.hari_instalasi}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Instalasi</Label>
                  <DatePicker
                    date={formData.tanggal_instalasi}
                    onSelect={handleDateChange}
                  />
                </div>
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
                  label={
                    formData.tipe_outlet === "Online"
                      ? "Link Meet (Akan Dibuat Otomatis)"
                      : "Link Meet (Tidak diperlukan untuk Offline)"
                  }
                  name="link_meet"
                  value={formData.link_meet}
                  onChange={handleInputChange}
                  disabled={true}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Menyimpan..." : "Simpan & Buat Link Meet"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}

// Helper komponen FormInput
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
