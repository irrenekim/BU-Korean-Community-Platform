"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import { MAX_IMAGES, optimizePostImage } from "@/lib/post-images";
import PostImages from "./PostImages";

export type PendingImage = { id: string; file: File };

function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(file);
    return () => { reader.onload = null; reader.abort(); };
  }, [file]);
  return url ? <Image src={url} alt="선택한 사진" width={160} height={120} unoptimized className="h-28 w-full object-contain" /> : null;
}

export default function PostImagePicker({ existing, pending, onExistingChange, onPendingChange, busy, onBusyChange }: {
  existing: string[];
  pending: PendingImage[];
  onExistingChange: (paths: string[]) => void;
  onPendingChange: (images: PendingImage[]) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [error, setError] = useState("");
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError("");
    if (!files.length) return;
    if (existing.length + pending.length + files.length > MAX_IMAGES) {
      setError("게시물당 사진은 최대 5장까지 추가할 수 있어요.");
      return;
    }
    onBusyChange(true);
    try {
      const additions: PendingImage[] = [];
      for (const file of files) additions.push({ id: crypto.randomUUID(), file: await optimizePostImage(file) });
      onPendingChange([...pending, ...additions]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진 처리에 실패했어요.");
    } finally {
      onBusyChange(false);
    }
  }
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">사진 ({existing.length + pending.length}/5)
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy}
          onChange={(event) => void select(event)} className="mt-2 block w-full text-sm" />
      </label>
      <p className="text-sm text-gray-500">JPG, PNG, WebP · 최대 5장 · 자동 압축 후 한 장당 5MB 이하 · 긴 쪽 최대 1920px</p>
      {existing.map((path, index) => (
        <div key={path} className="rounded-xl border p-2">
          <PostImages paths={[path]} />
          <button type="button" disabled={busy} onClick={() => onExistingChange(existing.filter((value) => value !== path))}
            className="text-sm text-red-700">사진 {index + 1} 제거</button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {pending.map((image) => <div key={image.id} className="rounded-xl border p-2">
          <Preview file={image.file} />
          <p className="text-xs text-gray-500">{(image.file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button type="button" disabled={busy} onClick={() => onPendingChange(pending.filter((value) => value.id !== image.id))}
            className="text-sm text-red-700">제거</button>
        </div>)}
      </div>
      {busy && <p role="status" className="text-sm">사진 처리 중…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
