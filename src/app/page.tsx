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
import {
  Save,
  Sparkles,
  Calendar,
  Clock,
  User,
  Building,
  Phone,
  MapPin,
  FileText,
  Link2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/lib/supabaseClient";
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

interface ApiFormData extends Omit<FormData, "tanggal_instalasi"> {
  tanggal_instalasi: string;
  google_access_token?: string;
}
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

const hours = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const minutes = ["00", "15", "30", "45"];

export default function Home() {
  const [rawText, setRawText] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);

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

  const getHariFromTanggal = (tanggal: string) => {
    if (!tanggal) return "";
    const [year, month, day] = tanggal.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("id-ID", { weekday: "long" });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      const hari = getHariFromTanggal(formattedDate);

      setFormData((prev) => ({
        ...prev,
        tanggal_instalasi: date,
        hari_instalasi: hari, // ISI OTOMATIS
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        tanggal_instalasi: undefined,
        hari_instalasi: "",
      }));
    }
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

      // Auto advance to step 2 after parsing
      setCurrentStep(2);

      toast.success("Data berhasil diurai!", {
        description: "Formulir telah terisi otomatis. Silakan verifikasi.",
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

      const dataToSend: ApiFormData = {
        ...formData,
        tanggal_instalasi: format(formData.tanggal_instalasi, "yyyy-MM-dd"),
        hari_instalasi: formData.hari_instalasi,
      };

      if (session.provider_token) {
        dataToSend.google_access_token = session.provider_token;
      }

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
        throw new Error(
          result.error || `Gagal menyimpan data (${response.status})`
        );
      }

      // Reset form dan kembali ke step 1 jika sukses
      setFormData(initialFormData);
      setRawText("");
      setCurrentStep(1);

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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Parser Jadwal
                </h1>
                <p className="text-muted-foreground text-lg">
                  Transform data mentah menjadi jadwal terstruktur secara instan
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
            <Button asChild variant="outline" className="gap-2">
              <Link href="/jadwal">
                <Calendar className="h-4 w-4" />
                Kalender
              </Link>
            </Button>
            <AuthButton />
          </div>
        </header>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border">
            <StepIndicator
              number={1}
              label="Tempel Data"
              isActive={currentStep === 1}
              isCompleted={currentStep > 1}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
            <StepIndicator
              number={2}
              label="Verifikasi"
              isActive={currentStep === 2}
              isCompleted={currentStep > 2}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
            <StepIndicator
              number={3}
              label="Simpan"
              isActive={currentStep === 3}
              isCompleted={false}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Input Section */}
          <div
            className={`transition-all duration-300 ${
              currentStep > 1 ? "xl:opacity-50 xl:scale-95" : ""
            }`}
          >
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Langkah 1: Tempel Data Mentah
                </CardTitle>
                <CardDescription>
                  Salin dan tempel data dari spreadsheet Anda. Sistem akan
                  secara otomatis mengurai informasi penting.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={12}
                    placeholder={`Contoh format data:
Nama Outlet
Nama Owner
081234567890
INV/2024/001
SCH/LEADS/001
Jl. Contoh Alamat No. 123
Tipe: Online
Langganan: Starter`}
                    className="resize-none border-2 focus:border-blue-300 transition-colors rounded-xl min-h-[200px]"
                  />

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-amber-100 rounded-full mt-0.5">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-800">
                          Tips Format Terbaik
                        </p>
                        <p className="text-xs text-amber-700">
                          Pastikan data memiliki: Nama Outlet, Nama Owner, No.
                          Telepon, No. Invoice, Alamat, dan Tipe Langganan dalam
                          baris terpisah.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t px-6 py-4">
                <Button
                  onClick={handleParse}
                  className="w-full py-6 text-base font-semibold rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                  disabled={!rawText.trim()}
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Urai Data Otomatis
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Form Section */}
          <div
            className={`transition-all duration-300 ${
              currentStep < 2 ? "xl:opacity-50 xl:scale-95" : ""
            }`}
          >
            <form onSubmit={handleSubmit}>
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm h-full">
                <CardHeader className="bg-linear-to-r from-green-50 to-emerald-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Langkah 2: Verifikasi & Simpan
                  </CardTitle>
                  <CardDescription>
                    Periksa data yang telah diurai, lengkapi informasi jadwal,
                    dan simpan ke sistem.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Informasi Outlet */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-700">
                      <Building className="h-5 w-5 text-blue-500" />
                      Informasi Outlet
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Nama Outlet"
                        name="nama_outlet"
                        value={formData.nama_outlet}
                        onChange={handleInputChange}
                        icon={<Building className="h-4 w-4" />}
                      />
                      <FormInput
                        label="Nama Owner"
                        name="nama_owner"
                        value={formData.nama_owner}
                        onChange={handleInputChange}
                        icon={<User className="h-4 w-4" />}
                      />
                      <FormInput
                        label="No Telepon"
                        name="no_telepon"
                        value={formData.no_telepon}
                        onChange={handleInputChange}
                        icon={<Phone className="h-4 w-4" />}
                      />
                      <FormInput
                        label="No Invoice"
                        name="no_invoice"
                        value={formData.no_invoice}
                        onChange={handleInputChange}
                        icon={<FileText className="h-4 w-4" />}
                      />
                    </div>
                    <FormInput
                      label="Alamat Lengkap"
                      name="alamat"
                      value={formData.alamat}
                      onChange={handleInputChange}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                    <FormInput
                      label="SCH Leads"
                      name="sch_leads"
                      value={formData.sch_leads}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Tipe & Langganan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="tipe_outlet"
                        className="flex items-center gap-2 text-sm font-medium"
                      >
                        <Link2 className="h-4 w-4 text-blue-500" />
                        Tipe Outlet
                      </Label>
                      <Select
                        name="tipe_outlet"
                        value={formData.tipe_outlet}
                        onValueChange={(value) =>
                          handleSelectChange("tipe_outlet", value)
                        }
                        required
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Pilih tipe outlet" />
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

                  {/* Jadwal Instalasi */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-700">
                      <Calendar className="h-5 w-5 text-green-500" />
                      Jadwal Instalasi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Hari Instalasi"
                        name="hari_instalasi"
                        value={formData.hari_instalasi}
                        onChange={handleInputChange}
                        required
                      />
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="h-4 w-4 text-green-500" />
                          Tanggal Instalasi
                        </Label>
                        <DatePicker
                          date={formData.tanggal_instalasi}
                          onSelect={handleDateChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4 text-purple-500" />
                          Waktu Instalasi
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={currentHour}
                            onValueChange={(value) =>
                              handleTimeChange("hour", value)
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
                            value={currentMinute}
                            onValueChange={(value) =>
                              handleTimeChange("minute", value)
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
                    </div>
                  </div>

                  {/* Link Meet */}
                  <div className="pt-4 border-t">
                    <FormInput
                      label={
                        formData.tipe_outlet === "Online"
                          ? "Link Google Meet (Akan dibuat otomatis)"
                          : "Link Meet (Tidak diperlukan untuk offline)"
                      }
                      name="link_meet"
                      value={formData.link_meet}
                      onChange={handleInputChange}
                      disabled={true}
                      icon={<Link2 className="h-4 w-4" />}
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t px-6 py-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full py-6 text-base font-semibold rounded-xl bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25"
                    disabled={isSubmitting || !formData.tanggal_instalasi}
                  >
                    <Save className="mr-2 h-5 w-5" />
                    {isSubmitting
                      ? "Menyimpan..."
                      : "Simpan Jadwal & Buat Link Meet"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponen Step Indicator
interface StepIndicatorProps {
  number: number;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}

function StepIndicator({
  number,
  label,
  isActive,
  isCompleted,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-medium text-sm transition-all ${
          isCompleted
            ? "bg-green-500 border-green-500 text-white"
            : isActive
            ? "bg-blue-500 border-blue-500 text-white"
            : "bg-white border-slate-300 text-slate-400"
        }`}
      >
        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>
      <span
        className={`font-medium transition-colors ${
          isActive || isCompleted ? "text-slate-800" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// Helper komponen FormInput dengan icon
interface FormInputProps {
  label: string;
  name: string;
  value: string;
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
