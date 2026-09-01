// 手機拍照常常一張就 3~8MB，超過 Vercel 平台的請求大小上限（約 4.5MB）會直接被擋掉，
// 收據辨識用不到原始解析度，上傳前先縮小壓縮可以從根本避免超過限制、也省 AI 費用
export async function resizeImageForUpload(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (file.type === 'image/heic' || file.type === 'image/heif') return file; // 瀏覽器普遍畫不出來，跳過

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = URL.createObjectURL(file);
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file; // 壓縮完反而更大就用原檔
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file; // 縮圖失敗就退回原檔，讓伺服器端的大小檢查去擋
  }
}
