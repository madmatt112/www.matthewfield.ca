import { cn } from "@/lib/utils";

interface SectionKickerProps {
  label: string;
  className?: string;
}

export function SectionKicker({ label, className }: SectionKickerProps) {
  return (
    <p className={cn("font-mono text-xs uppercase tracking-widest text-brand", className)}>
      / {label}
    </p>
  );
}
