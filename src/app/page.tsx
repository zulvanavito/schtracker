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
    <div className="min-h-screen bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-blue-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 ring-4 ring-blue-50">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
                  Smart Parser
                </h1>
                <p className="text-slate-500 text-lg font-medium">
                  Transform raw text into structured schedules instantly
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <Button
              asChild
              variant="outline"
              className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium"
            >
              <Link href="/tabel">
                <FileText className="h-4 w-4" />
                Data Table
              </Link>
            </Button>
            <Button
              asChild
              className="glass-button gap-2 rounded-xl h-11 px-5 border-slate-200 text-slate-600 font-medium hover:text-blue-600"
            >
              <Link href="/jadwal">
                <Calendar className="h-4 w-4" />
                Calendar
              </Link>
            </Button>
            <div className="pl-3 border-l border-slate-200">
              <AuthButton />
            </div>
          </div>
        </header>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-6 bg-white/60 backdrop-blur-md rounded-2xl px-6 py-3 shadow-sm border border-white/50">
            <StepIndicator
              number={1}
              label="Paste Data"
              isActive={currentStep === 1}
              isCompleted={currentStep > 1}
            />
            <div className={`h-1 w-12 rounded-full ${currentStep > 1 ? "bg-green-500" : "bg-slate-200"}`} />
            <StepIndicator
              number={2}
              label="Review & Save"
              isActive={currentStep === 2}
              isCompleted={currentStep > 2}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <div
            className={`transition-all duration-500 ease-in-out ${
              currentStep > 1 ? "xl:opacity-40 xl:scale-95 blur-sm grayscale-[0.5]" : ""
            }`}
          >
            <Card className="glass-card border-0">
              <CardHeader className="border-b border-slate-100/50 pb-4">
                <CardTitle className="flex items-center gap-3 text-xl text-slate-800">
                   <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                        <ListRestart className="h-5 w-5" />
                    </div>
                  Step 1: Input Raw Data
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Paste data from WhatsApp or Excel. Our AI-like parser will detect key info.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={12}
                    placeholder={`Expected Format:
Nama Outlet
Nama Owner
081234567890
INV/2024/001
SCH/LEADS/001
Jl. Example Address No. 123
Tipe: Online
Langganan: Starter`}
                    className="resize-none rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all duration-300 min-h-[280px] font-mono text-sm leading-relaxed"
                  />

                  <div className="bg-amber-50/80 border border-amber-200/50 rounded-xl p-4 flex gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-800">Pro Tip</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Ensure each data point (Name, Phone, Invoice, etc.) is on a new line for best accuracy.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/30 border-t border-slate-100/50 px-6 py-4">
                <Button
                  onClick={handleParse}
                  className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-300"
                  disabled={!rawText.trim()}
                >
                  <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                  Auto Parse Data
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Form Section */}
          <div
            className={`transition-all duration-500 ease-in-out ${
              currentStep < 2 ? "xl:opacity-50 xl:scale-95 pointer-events-none" : "scale-100 opacity-100"
            }`}
          >
            <form onSubmit={handleSubmit}>
              <Card className={`glass-card border-0 h-full ${currentStep < 2 ? "ring-0" : "ring-4 ring-green-50"}`}>
                <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border-b border-emerald-100/50 pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl text-slate-800">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    Step 2: Verify & Save
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Review parsed data, add schedule time, and confirm.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Informasi Outlet */}
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Building className="h-4 w-4" /> Outlet Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  <div className="space-y-5">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <ListRestart className="h-4 w-4" /> Classification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                        <Label
                            htmlFor="tipe_outlet"
                            className="flex items-center gap-2 text-sm font-medium text-slate-700"
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
                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                            <SelectValue placeholder="Select type" />
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

                  {/* Jadwal Instalasi */}
                  <div className="pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-5">
                      <Clock className="h-4 w-4" /> Scheduling
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <FormInput
                        label="Hari"
                        name="hari_instalasi"
                        value={formData.hari_instalasi}
                        onChange={handleInputChange}
                        required
                      />
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Calendar className="h-4 w-4 text-emerald-500" />
                          Tanggal
                        </Label>
                        <DatePicker
                          date={formData.tanggal_instalasi}
                          onSelect={handleDateChange}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                              <SelectValue placeholder="HH" />
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
                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                              <SelectValue placeholder="MM" />
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
                  </div>

                  {/* Link Meet */}
                  <div className="pt-4 border-t border-slate-100">
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
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/30 border-t border-slate-100 px-6 py-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
                    disabled={isSubmitting || !formData.tanggal_instalasi}
                  >
                     {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Saving...
                        </div>
                     ) : (
                        <div className="flex items-center gap-2">
                            <Save className="h-5 w-5" />
                            Save Schedule & Generate Link
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
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm transition-all shadow-sm ${
          isCompleted
            ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-200"
            : isActive
            ? "bg-blue-600 border-blue-600 text-white shadow-blue-200"
            : "bg-white border-slate-200 text-slate-300"
        }`}
      >
        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : number}
      </div>
      <span
        className={`font-semibold tracking-wide transition-colors ${
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
        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all duration-300 shadow-sm"
      />
    </div>
  );
}
