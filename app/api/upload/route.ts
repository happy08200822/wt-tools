import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

// GET /api/upload - 列出目前 Blob Store 裡所有上傳過的圖片（不用存 DB，直接查 Blob 本身）
export async function GET() {
  try {
    const { blobs } = await list({ limit: 100 });
    const sorted = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    return NextResponse.json(sorted);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '讀取失敗' },
      { status: 500 }
    );
  }
}

// POST /api/upload - 上傳圖片到 Vercel Blob，只回傳網址，不存進資料庫
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '請選擇檔案' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: '只能上傳圖片檔案' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '檔案太大，請上傳 10MB 以下的圖片' }, { status: 400 });
  }

  try {
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '上傳失敗' },
      { status: 500 }
    );
  }
}
