import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDurationInMs(
  item: { tipe_langganan?: string; tipe_outlet?: string }
) {
  let durationHours = 0;
  const langganan = item.tipe_langganan
    ? item.tipe_langganan.toLowerCase()
    : "";
  const tipe = item.tipe_outlet ? item.tipe_outlet.toLowerCase() : "";
  switch (langganan) {
    case "starter basic":
      durationHours = 1;
      break;
    case "starter":
      durationHours = 2;
      break;
    case "advance":
    case "prime":
    case "training berbayar":
      durationHours = 3;
      break;
    default:
      durationHours = 2;
  }
  let durationMs = durationHours * 60 * 60 * 1000;
  if (tipe === "offline") {
    durationMs += 30 * 60 * 1000;
  }
  return durationMs;
}

export function formatSchLeadsToUrl(schLeads: string): string | null {
  if (!schLeads) return null;
  const formatted = schLeads.replace(/\//g, " ").trim();
  const encoded = encodeURIComponent(formatted);
  return `https://crm.majoo.id/field-operations/detail/${encoded}`;
}
