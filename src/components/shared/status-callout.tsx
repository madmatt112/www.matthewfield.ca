import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "info" | "error";

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  error: "bg-destructive/10 text-destructive",
};

const TONE_DEFAULT_ICON: Record<Tone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
};

const TONE_LABEL: Record<Tone, string> = {
  success: "Success",
  warning: "Warning",
  info: "Information",
  error: "Error",
};

interface StatusCalloutProps extends React.ComponentPropsWithRef<"div"> {
  tone: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function StatusCallout({ tone, icon, children, className, ...rest }: StatusCalloutProps) {
  const Icon = icon ?? TONE_DEFAULT_ICON[tone];
  return (
    <div className={cn("flex gap-3 rounded-md p-4", TONE_STYLES[tone], className)} {...rest}>
      <Icon aria-label={TONE_LABEL[tone]} className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
