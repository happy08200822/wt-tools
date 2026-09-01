import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// POST /api/sign-requests/:id/reset - 老闆把已簽署的請求作廢重簽：現在的簽署版本先存進
// signHistory 留底，狀態才退回待簽署，客戶用同一個連結可以重新簽一次
export async function POST(_request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const signRequest = await SignRequest.findById(id);
  if (!signRequest || signRequest.user.toString() !== currentUser._id) {
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
