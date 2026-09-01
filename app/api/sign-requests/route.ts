import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import { getCurrentUser } from '@/lib/session';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB，Vercel Serverless Function 的 request body 上限
const ALLOWED_TYPES = ['application/pdf'];

function parseNumberField(value: FormDataEntryValue | undefined | null): number | undefined {
  return typeof value === 'string' && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined;
}

// GET /api/sign-requests - 列出目前登入者建立過的簽約請求
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const requests = await SignRequest.find({ user: currentUser._id })
    .select('customerName fileName fileUrl fileSize status signedAt signedFileUrl signHistory createdAt')
    .sort({ createdAt: -1 });

  return NextResponse.json(requests);
}

// POST /api/sign-requests - 上傳合約 PDF，建立一筆待簽署的請求
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const customerName = formData?.get('customerName');
  const signatureX = parseNumberField(formData?.get('signatureX'));
  const signatureY = parseNumberField(formData?.get('signatureY'));
  const signatureWidth = parseNumberField(formData?.get('signatureWidth'));
  const signatureHeight = parseNumberField(formData?.get('signatureHeight'));

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '請選擇合約 PDF' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '目前只支援 PDF 檔案' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '檔案太大，請上傳 4MB 以下的檔案' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await dbConnect();

  let blob;
  try {
    blob = await put(file.name, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `檔案上傳失敗：${err.message}` : '檔案上傳失敗' },
      { status: 500 }
    );
  }

  const signRequest = await SignRequest.create({
    user: currentUser._id,
    customerName: typeof customerName === 'string' ? customerName.trim().slice(0, 100) : '',
    fileName: file.name,
    fileUrl: blob.url,
    fileType: file.type,
    fileSize: file.size,
    signatureX,
    signatureY,
    signatureWidth,
    signatureHeight,
  });

  return NextResponse.json(signRequest, { status: 201 });
}
