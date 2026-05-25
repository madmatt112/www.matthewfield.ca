/**
 * Shared client-side clipboard primitives consumed by <CopyButton /> and
 * <CopyURLButton />.
 *
 * - `decodeUtf8B64` decodes a base64 string as UTF-8 (NOT plain atob, which
 *   returns a binary string and corrupts non-ASCII payloads).
 * - `announceCopyStatus` updates the server-rendered `#copy-status` aria-live
 *   region via direct DOM (no React context — buttons are hydrated outside the
 *   React tree via the `data-copy-button` marker pattern).
 * - `copyToClipboard` prefers `navigator.clipboard.writeText` and falls back
 *   to a temporary off-screen `<textarea>` + `document.execCommand("copy")`.
 */

export function decodeUtf8B64(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

let clearTimer: number | undefined;

export function announceCopyStatus(status: string): void {
  const region = document.getElementById("copy-status");
  if (!region) return;
  region.textContent = status;
  if (clearTimer !== undefined) {
    clearTimeout(clearTimer);
    clearTimer = undefined;
  }
  if (status) {
    clearTimer = window.setTimeout(() => {
      const r = document.getElementById("copy-status");
      if (r) r.textContent = "";
      clearTimer = undefined;
    }, 2000);
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to execCommand fallback
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.left = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    try {
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      return ok;
    } finally {
      textarea.remove();
    }
  } catch {
    return false;
  }
}
