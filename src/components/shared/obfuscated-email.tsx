"use client";

import Obfuscate from "react-obfuscate";

import { siteConfig } from "@/config/site";

export function ObfuscatedEmail() {
  return (
    <span
      aria-label="Reveal Matthew's email address"
      className="inline-flex min-h-11 items-center px-3 py-1"
    >
      <Obfuscate email={siteConfig.links.email} />
    </span>
  );
}
