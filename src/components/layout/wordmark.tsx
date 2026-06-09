import Link from "next/link";

import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  asLink?: boolean;
}

export function Wordmark({ className, asLink = true }: WordmarkProps) {
  const mark = (
    <span className={cn("font-mono", className)}>
      mf<span className="text-brand">/</span>
    </span>
  );

  if (!asLink) {
    return mark;
  }

  return (
    <Link href="/" aria-label="Matthew Field — home">
      {mark}
    </Link>
  );
}
