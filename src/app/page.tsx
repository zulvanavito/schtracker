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
  ListRestart,
  CreditCard,
  Zap,
  MonitorPlay,
} from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";

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

      // No visual restriction update here needed anymore as logic is in render
      setCurrentStep(2);

      toast.success("Parsed Successfully!", {
        description: "Review details and complete the schedule.",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Parsing Failed", { description: errorMessage });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validasi form
      if (!formData.tanggal_instalasi) {
        toast.error("Validation Error", {
          description: "Installation Date is required.",
        });
        return;
      }
      if (
        !formData.pukul_instalasi ||
        formData.pukul_instalasi.split(":").length < 2
      ) {
        toast.error("Validation Error", {
          description: "Installation Time is required.",
        });
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        throw new Error("Session Error: " + sessionError.message);
      }

      if (!session) {
        throw new Error("Login Required. Please sign in first.");
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
          result.error || `Failed to save data (${response.status})`
        );
      }

      // Reset form dan kembali ke step 1 jika sukses
      setFormData(initialFormData);
      setRawText("");
      setCurrentStep(1);

      toast.success("Schedule Saved!", {
        description: `Link Meet: ${
          result.data?.link_meet || "Not available / Offline"
        }`,
      });
    } catch (error: unknown) {
      console.error("❌ Error in handleSubmit:", error);

      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMessage = "Session expired. Please login again.";
        } else if (error.message.includes("Google access token")) {
          errorMessage =
            "Google Token missing. Please re-login with Google.";
        }
      }

      toast.error("Failed to Save", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [currentHour = "", currentMinute = ""] =
    formData.pukul_instalasi.split(":");

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-blue-100 p-4 md:p-8 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          title={
            <>
              Smart<span className="text-blue-600">Parser</span>
            </>
          }
          subtitle="Intelligent Schedule Automation"
          icon={<Sparkles className="h-8 w-8" />}
        >
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50 hover:-translate-y-1 transition-all duration-300"
          >
            <Link href="/tabel">
              <FileText className="h-4 w-4" />
              Data Table
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50 hover:-translate-y-1 transition-all duration-300"
          >
            <Link href="/jadwal">
              <Calendar className="h-4 w-4" />
              Calendar
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50 hover:-translate-y-1 transition-all duration-300"
          >
            <Link href="/todo">
              <FileText className="h-4 w-4" />
              To-Do
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50 hover:-translate-y-1 transition-all duration-300"
          >
            <Link href="/activity">
              <MonitorPlay className="h-4 w-4" />
              Activity
            </Link>
          </Button>
        </Header>

        {/* Progress Steps */}
        <div className="relative mb-16 hidden md:block">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 rounded-full -z-10 overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
                    style={{ width: currentStep === 1 ? '50%' : '100%' }}
                />
            </div>
            <div className="flex justify-between max-w-2xl mx-auto">
                 <StepIndicator
                  number={1}
                  label="Input Raw Data"
                  isActive={currentStep === 1}
                  isCompleted={currentStep > 1}
                />
                 <StepIndicator
                  number={2}
                  label="Review & Confirm"
                  isActive={currentStep === 2}
                  isCompleted={currentStep > 2}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Input Section */}
          <div className="xl:col-span-4 transition-all duration-500 ease-in-out">
            <Card className="glass bg-white/40 backdrop-blur-xl border-white/40 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500">
              <CardHeader className="border-b border-white/30 pb-6 pt-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                   <div className="p-2.5 bg-blue-100/80 rounded-2xl text-blue-600 shadow-sm">
                        <ListRestart className="h-6 w-6" />
                    </div>
                  Raw Input
                </CardTitle>
                <CardDescription className="text-slate-500 text-base font-medium">
                  Paste WhatsApp chat or Excel rows here.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={15}
                    placeholder={`Expected Format:
Nama Outlet
Nama Owner
081234567890
INV/2024/001
SCH/LEADS/001
Jl. Example Address No. 123
Tipe: Online
Langganan: Starter`}
                    className="resize-none rounded-2xl border-white/40 bg-white/40 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 min-h-[350px] font-mono text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 shadow-inner"
                  />

                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
                    <div className="p-2 bg-amber-100 rounded-xl rounded-tl-none">
                        <Zap className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-900">Parsing Tip</p>
                      <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                        Use one line per data point for best results. Our AI works best with clear line breaks.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white/30 border-t border-white/30 px-6 py-6">
                <Button
                  onClick={handleParse}
                  className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-300 group"
                  disabled={!rawText.trim()}
                >
                  <Sparkles className="mr-2 h-5 w-5 group-hover:animate-ping" />
                  Smart Parse
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Form Section */}
          <div className="xl:col-span-8 transition-all duration-500 ease-in-out">
            <form onSubmit={handleSubmit}>
              <Card className="glass bg-white/60 backdrop-blur-2xl border-white/60 shadow-2xl shadow-slate-200/50 rounded-3xl h-full overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/50 border-b border-white/50 pb-6 pt-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                     <CardTitle className="flex items-center gap-4 text-2xl font-bold text-slate-800">
                        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 shadow-sm ring-4 ring-emerald-50">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            Review Information
                            <span className="block text-sm font-medium text-slate-400 mt-1">Make sure everything is correct</span>
                        </div>
                    </CardTitle>
                    <div className="hidden md:block px-4 py-2 bg-white/50 rounded-xl border border-white/50 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Step 02
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-10">
                  {/* Informasi Outlet */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1 bg-blue-500 rounded-r-full" />
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400" /> Outlet Information
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput
                        label="Nama Outlet"
                        name="nama_outlet"
                        value={formData.nama_outlet}
                        onChange={handleInputChange}
                        icon={<Building className="h-4 w-4" />}
                        placeholder="e.g. Kopi Kenangan"
                      />
                      <FormInput
                        label="Nama Owner"
                        name="nama_owner"
                        value={formData.nama_owner}
                        onChange={handleInputChange}
                        icon={<User className="h-4 w-4" />}
                        placeholder="e.g. Budi Santoso"
                      />
                      <FormInput
                        label="No Telepon"
                        name="no_telepon"
                        value={formData.no_telepon}
                        onChange={handleInputChange}
                        icon={<Phone className="h-4 w-4" />}
                        placeholder="0812..."
                      />
                      <FormInput
                        label="No Invoice"
                        name="no_invoice"
                        value={formData.no_invoice}
                        onChange={handleInputChange}
                        icon={<FileText className="h-4 w-4" />}
                        placeholder="INV/..."
                      />
                    </div>
                    <FormInput
                      label="Alamat Lengkap"
                      name="alamat"
                      value={formData.alamat}
                      onChange={handleInputChange}
                      icon={<MapPin className="h-4 w-4" />}
                      placeholder="Detailed address..."
                    />
                    <FormInput
                      label="SCH Leads"
                      name="sch_leads"
                      value={formData.sch_leads}
                      onChange={handleInputChange}
                      placeholder="SCH/LEADS/..."
                    />
                  </section>

                  {/* Tipe & Langganan */}
                  <section className="space-y-6">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1 bg-purple-500 rounded-r-full" />
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" /> Services
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label
                            htmlFor="tipe_outlet"
                            className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1"
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
                            <SelectTrigger className="h-12 rounded-2xl border-white/60 bg-white/50 hover:bg-white/80 transition-colors shadow-sm focus:ring-4 focus:ring-blue-100/50">
                            <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/80 bg-white/90 backdrop-blur-xl">
                            <SelectItem value="Online" className="rounded-xl focus:bg-blue-50 cursor-pointer">Online</SelectItem>
                            <SelectItem value="Offline" className="rounded-xl focus:bg-blue-50 cursor-pointer">Offline</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                        <FormInput
                        label="Tipe Langganan"
                        name="tipe_langganan"
                        value={formData.tipe_langganan}
                        onChange={handleInputChange}
                        placeholder="Starter / Advance..."
                        />
                    </div>
                  </section>

                  {/* Jadwal Instalasi */}
                  <section className="space-y-6 pt-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1 bg-emerald-500 rounded-r-full" />
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" /> Installation Schedule
                        </h3>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-white/60 to-slate-50/60 rounded-[2rem] border border-white/60 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormInput
                            label="Hari"
                            name="hari_instalasi"
                            value={formData.hari_instalasi}
                            onChange={handleInputChange}
                            required
                            placeholder="Auto-filled"
                        />
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                            <Calendar className="h-4 w-4 text-emerald-500" />
                            Tanggal
                            </Label>
                            <DatePicker
                            date={formData.tanggal_instalasi}
                            onSelect={handleDateChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                            <Clock className="h-4 w-4 text-purple-500" />
                            Waktu
                            </Label>
                            <div className="flex gap-2">
                            <Select
                                value={currentHour}
                                onValueChange={(value) =>
                                handleTimeChange("hour", value)
                                }
                                required
                            >
                                <SelectTrigger className="h-12 rounded-2xl border-white/60 bg-white/80 shadow-sm">
                                <SelectValue placeholder="HH" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 rounded-xl">
                                {hours.map((hour) => (
                                    <SelectItem key={hour} value={hour} className="rounded-lg focus:bg-slate-100">
                                    {hour}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <span className="flex items-center text-slate-400 font-bold">:</span>
                            <Select
                                value={currentMinute}
                                onValueChange={(value) =>
                                handleTimeChange("minute", value)
                                }
                                required
                            >
                                <SelectTrigger className="h-12 rounded-2xl border-white/60 bg-white/80 shadow-sm">
                                <SelectValue placeholder="MM" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                {minutes.map((minute) => (
                                    <SelectItem key={minute} value={minute} className="rounded-lg focus:bg-slate-100">
                                    {minute}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </div>
                        </div>
                        </div>
                    </div>
                  </section>

                  {/* Link Meet */}
                  <div className="pt-2">
                    <FormInput
                      label={
                        formData.tipe_outlet === "Online"
                          ? "Auto-generated Google Meet Link"
                          : "Meeting Link (Offline N/A)"
                      }
                      name="link_meet"
                      value={formData.link_meet}
                      onChange={handleInputChange}
                      disabled={true}
                      icon={<Link2 className="h-4 w-4" />}
                      placeholder="Will be generated after saving..."
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-white/40 border-t border-white/40 px-8 py-8 backdrop-blur-md">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 group"
                    disabled={isSubmitting || !formData.tanggal_instalasi}
                  >
                     {isSubmitting ? (
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            Saving Schedule...
                        </div>
                     ) : (
                        <div className="flex items-center gap-3">
                            <Save className="h-6 w-6 group-hover:scale-110 transition-transform" />
                            Confirm & Save Schedule
                        </div>
                     )}
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
    <div className={`flex flex-col items-center gap-3 relative z-10 transition-all duration-500 ${isActive || isCompleted ? 'scale-110' : 'scale-100 opacity-70'}`}>
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-full border-4 font-black text-lg transition-all duration-500 shadow-xl ${
          isCompleted
            ? "bg-emerald-500 border-emerald-100 text-white shadow-emerald-500/30"
            : isActive
            ? "bg-blue-600 border-blue-100 text-white shadow-blue-500/30"
            : "bg-white border-slate-200 text-slate-300"
        }`}
      >
        {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : number}
      </div>
      <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm transition-all duration-500 ${
          isActive || isCompleted ? "bg-white/80 text-slate-800 shadow-sm" : "bg-transparent text-slate-400"
      }`}>
        {label}
      </div>
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
  placeholder?: string;
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
  placeholder,
}: FormInputProps) {
  return (
    <div className="space-y-2 group">
      <Label
        htmlFor={name}
        className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1 transition-colors group-hover:text-blue-600"
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
        placeholder={placeholder}
        className="h-12 rounded-2xl border-white/60 bg-white/50 hover:bg-white/80 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100/50 transition-all duration-300 shadow-sm placeholder:text-slate-300 text-slate-800 font-medium"
      />
    </div>
  );
}
