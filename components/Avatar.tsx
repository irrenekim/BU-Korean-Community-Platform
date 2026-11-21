import { avatarColor, initials } from "@/lib/format";

export default function Avatar({ name, size = "md" }: { name: string | null | undefined; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${box} ${avatarColor(name)}`}>
      {initials(name)}
    </span>
  );
}
