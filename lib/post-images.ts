export const IMAGE_BUCKET = "post-images";
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_SIZE_ERROR = "사진 한 장당 최대 5MB까지 업로드할 수 있어요.";
const TYPES = ["image/jpeg", "image/png", "image/webp"];

// Source files may exceed 5MB; the encoded upload must not. Decode one at a time.
export async function optimizePostImage(file: File): Promise<File> {
  if (!TYPES.includes(file.type)) throw new Error("JPG, PNG, WebP 이미지만 추가할 수 있어요.");
  if (file.size > 30 * 1024 * 1024) throw new Error("원본 사진은 30MB 이하로 선택해 주세요.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("사진을 읽을 수 없어요. JPG, PNG, WebP 파일을 확인해 주세요.");
  });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 60_000_000) {
      throw new Error("사진 해상도가 너무 커요. 6천만 화소 이하로 줄여 주세요.");
    }
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이 브라우저에서 사진을 처리할 수 없어요.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (!blob) throw new Error("사진 압축에 실패했어요. 다른 사진으로 시도해 주세요.");
      if (blob.size <= MAX_IMAGE_BYTES) {
        const extension = blob.type === "image/webp" ? "webp" : "png";
        return new File([blob], `${crypto.randomUUID()}.${extension}`, { type: blob.type });
      }
    }
    throw new Error(IMAGE_SIZE_ERROR);
  } finally {
    bitmap.close();
  }
}
