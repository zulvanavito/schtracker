"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200/50 group-[.toaster]:shadow-2xl group-[.toaster]:shadow-blue-500/10 group-[.toaster]:rounded-3xl hover:group-[.toaster]:scale-[1.02] hover:group-[.toaster]:-translate-y-1 transition-all duration-300 font-sans",
          description: "group-[.toast]:text-slate-500 font-medium",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:shadow-lg group-[.toast]:shadow-blue-500/20",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 group-[.toast]:font-semibold group-[.toast]:rounded-xl",
          success: "group-[.toaster]:!bg-emerald-50/90 group-[.toaster]:!border-emerald-100 group-[.toaster]:!text-emerald-900",
          error: "group-[.toaster]:!bg-red-50/90 group-[.toaster]:!border-red-100 group-[.toaster]:!text-red-900",
          info: "group-[.toaster]:!bg-blue-50/90 group-[.toaster]:!border-blue-100 group-[.toaster]:!text-blue-900",
          warning: "group-[.toaster]:!bg-amber-50/90 group-[.toaster]:!border-amber-100 group-[.toaster]:!text-amber-900",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
