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
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
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
  tanggal_instalasi: string;
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
  tanggal_instalasi: "",
  pukul_instalasi: "",
  link_meet: "",
};

export default function Home() {
  const [rawText, setRawText] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "tipe_outlet" && value === "Offline" && { link_meet: "" }),
    }));
  };

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
        tanggal_instalasi: "",
        pukul_instalasi: "",
        link_meet: dataTerurai.tipe_outlet === "Offline" ? "" : prev.link_meet,
      }));

      toast.success("Data berhasil diurai!", {
        description: "Silakan periksa & lengkapi form di Langkah 2.",
      });
    } catch (error: any) {
      toast.error("Gagal mengurai data", { description: error.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const response = await fetch("/api/simpan-jadwal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Gagal menyimpan data");

          setFormData(initialFormData); // Reset form
          setRawText("");
          resolve(result.data[0]); // Kirim data yang sukses
        } catch (error) {
          reject(error); // Kirim error
        }
      });

    toast.promise(promise, {
      loading: "Menyimpan data...",
      success: (data: any) => `Data berhasil disimpan! (ID: ${data.id})`,
      error: (err: any) => `Error: ${err.message}`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Alat Pembuat Jadwal</h1>
        <div className="space-x-2">
          <Button asChild variant="secondary">
            <Link href="/tabel">Lihat Daftar Tabel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jadwal">Lihat Kalender</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Langkah 1: Paste Data Mentah</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            placeholder="Paste data mentah dari spreadsheet di sini..."
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleParse}>Urai Data (Parse)</Button>
        </CardFooter>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Langkah 2: Verifikasi Data & Simpan Jadwal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom Kiri */}
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
                <FormInput
                  label="Hari Instalasi"
                  name="hari_instalasi"
                  value={formData.hari_instalasi}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {/* Kolom Kanan */}
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
                <FormInput
                  label="Tanggal Instalasi"
                  name="tanggal_instalasi"
                  value={formData.tanggal_instalasi}
                  onChange={handleInputChange}
                  type="date"
                  required
                />
                <FormInput
                  label="Pukul Instalasi"
                  name="pukul_instalasi"
                  value={formData.pukul_instalasi}
                  onChange={handleInputChange}
                  type="time"
                  required
                />
              </div>
            </div>
            {/* Field Link Meet (lebar penuh) */}
            <FormInput
              label="Link Meet"
              name="link_meet"
              value={formData.link_meet}
              onChange={handleInputChange}
              disabled={formData.tipe_outlet === "Offline"}
              required={formData.tipe_outlet === "Online"}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" size="lg" className="w-full">
              Simpan Jadwal Baru
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

// Helper komponen FormInput baru untuk shadcn/ui
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
