import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import { resolveUser } from '@/app/lib/richmenuUsers';

type Params = { params: Promise<{ id: string }> };

// POST /api/sign-requests/:id/reset - 把已簽署的請求作廢重簽：現在的簽署版本先存進
// signHistory 留底，狀態才退回待簽署，客戶用同一個連結可以重新簽一次
export async function POST(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.accessCode === 'string' ? body.accessCode.trim() : '';
  const userName = await resolveUser(code);
  if (!userName) {
    return NextResponse.json({ error: '密碼錯誤，請跟暐庭索取正確的密碼' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const signRequest = await SignRequest.findById(id);
  if (!signRequest) {
    return NextResponse.json({ error: '找不到這筆簽約請求' }, { status: 404 });
  }
  if (signRequest.status !== 'signed' || !signRequest.signedAt) {
    return NextResponse.json({ error: '這份合約還沒簽署，不能作廢重簽' }, { status: 400 });
  }

  signRequest.signHistory.push({
    signedAt: signRequest.signedAt,
    signatureImageUrl: signRequest.signatureImageUrl,
    signedFileUrl: signRequest.signedFileUrl,
    signedFileSize: signRequest.signedFileSize,
    voidedAt: new Date(),
  });

  signRequest.status = 'pending';
  signRequest.signatureImageUrl = '';
  signRequest.signedAt = undefined;
  signRequest.signedFileUrl = '';
  signRequest.signedFileSize = 0;
  await signRequest.save();

  return NextResponse.json(signRequest);
}
