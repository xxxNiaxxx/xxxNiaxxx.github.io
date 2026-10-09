import Image from "next/image";
import { cn } from "@/lib/utils";

/** The house mark of the logo (decorative: the app name is always written next to it). */
export function Logo({ className = "size-8" }: { className?: string }) {
  return <Image src="/logo-mark.png" alt="" width={64} height={64} className={cn("shrink-0 object-contain", className)} priority />;
}
