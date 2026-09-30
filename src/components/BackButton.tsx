import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  label?: string;
}

export default function BackButton({ href, label = "Back" }: BackButtonProps) {
  return (
    <Link href={href} className="inline-flex min-h-[44px] min-w-0 items-center gap-2 py-1 text-sm font-semibold break-words text-[var(--color-primary)]">
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
