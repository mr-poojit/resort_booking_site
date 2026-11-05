import Link from "next/link";
import { BRAND_LOCATION, BRAND_NAME } from "@/lib/brand";

export function BrandMark({ detail = BRAND_LOCATION }: { detail?: string }) {
  return (
    <Link
      href="/"
      className="text-estate-green text-xs font-semibold tracking-[0.12em]"
    >
      {BRAND_NAME}
      <span className="text-muted-green mt-1 block text-[10px] font-normal tracking-[0.08em]">
        {detail}
      </span>
    </Link>
  );
}
