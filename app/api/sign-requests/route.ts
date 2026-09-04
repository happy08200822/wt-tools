import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import { resolveUser } from '@/app/lib/richmenuUsers';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB，Vercel Serverless Function 的 request body 上限
const ALLOWED_TYPES = ['application/pdf'];

function parseNumberField(value: FormDataEntryValue | undefined | null): number | undefined {
  return typeof value === 'string' && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined;
}

// GET /api/sign-requests?code=xxx - 列出所有簽約請求（跟同事共用同一份清單，代碼只是進門密碼）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code')?.trim() ?? '';
  const userName = await resolveUser(code);
  if (!userName) {
    return NextResponse.json({ error: '密碼錯誤，請跟暐庭索取正確的密碼' }, { status: 401 });
  }

  await dbConnect();
  const requests = await SignRequest.find()
    .select(
      'customerName creatorName fileName fileUrl fileSize status signedAt signedFileUrl signHistory paymentAmount paymentChoice createdAt'
    )
    .sort({ createdAt: -1 });

  return NextResponse.json(requests);
}

// POST /api/sign-requests - 上傳合約 PDF，建立一筆待簽署的請求
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const code = typeof formData?.get('accessCode') === 'string' ? (formData.get('accessCode') as string).trim() : '';
  const userName = await resolveUser(code);
  if (!userName) {
    return NextResponse.json({ error: '密碼錯誤，請跟暐庭索取正確的密碼' }, { status: 401 });
  }

  const file = formData?.get('file');
  const customerName = formData?.get('customerName');
  const signatureX = parseNumberField(formData?.get('signatureX'));
  const signatureY = parseNumberField(formData?.get('signatureY'));
  const signatureWidth = parseNumberField(formData?.get('signatureWidth'));
  const signatureHeight = parseNumberField(formData?.get('signatureHeight'));
  const paymentAmount = parseNumberField(formData?.get('paymentAmount'));

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
    creatorCode: code,
    creatorName: userName,
    customerName: typeof customerName === 'string' ? customerName.trim().slice(0, 100) : '',
    fileName: file.name,
    fileUrl: blob.url,
    fileType: file.type,
    fileSize: file.size,
    signatureX,
    signatureY,
    signatureWidth,
    signatureHeight,
    paymentAmount,
  });

  return NextResponse.json(signRequest, { status: 201 });
}
