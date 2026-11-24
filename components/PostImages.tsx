"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { IMAGE_BUCKET } from "@/lib/post-images";

// Private bucket: URLs are issued only to users allowed by Storage RLS.
export default function PostImages({ paths }: { paths: string[] }) {
  const supabase = useSupabase();
  const [urls, setUrls] = useState<{ path: string; url: string }[]>([]);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify(paths);
  useEffect(() => {
    let active = true;
    async function load() {
      const requested = JSON.parse(key) as string[];
      if (!requested.length) return;
      const { data, error: signingError } = await supabase.storage.from(IMAGE_BUCKET)
        .createSignedUrls(requested, 3600);
      if (!active) return;
      setError(Boolean(signingError || data?.some((entry) => entry.error)));
      setUrls((data ?? []).flatMap((entry) => entry.signedUrl && entry.path
        ? [{ path: entry.path, url: entry.signedUrl }] : []));
    }
    void load();
    const timer = setInterval(() => void load(), 50 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [supabase, key, retry]);
  if (!paths.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {urls.filter((entry) => paths.includes(entry.path)).map((entry, index) => (
          <a key={entry.path} href={entry.url} target="_blank" rel="noopener noreferrer"
            className="relative block h-48 overflow-hidden rounded-xl bg-gray-100" aria-label={`사진 ${index + 1} 크게 보기`}>
            <Image src={entry.url} alt={`게시물 사진 ${index + 1}`} fill unoptimized
              sizes="(max-width: 640px) 45vw, 300px" className="object-contain" />
          </a>
        ))}
      </div>
      {error && <p role="status" className="text-sm text-red-700">사진을 불러오지 못했어요. <button type="button"
        onClick={() => setRetry((value) => value + 1)} className="underline">다시 시도</button></p>}
    </div>
  );
}
