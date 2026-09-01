import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { del } from '@vercel/blob';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// GET /api/sign-requests/:id - 老闆查看單筆簽約請求的完整詳情（含已簽署版下載連結）
export async function GET(_request: Request, { params }: Params) {
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

  return NextResponse.json(signRequest);
}

// DELETE /api/sign-requests/:id - 老闆刪除一筆簽約請求（傳錯合約、客戶不簽了等情況），
// 連同原始合約、簽名圖、已簽署版 PDF、歷史版本一起從 Blob 清掉，不可復原
export async function DELETE(_request: Request, { params }: Params) {
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

  const urls = [
    signRequest.fileUrl,
    signRequest.signatureImageUrl,
    signRequest.signedFileUrl,
    ...signRequest.signHistory.flatMap((h: { signatureImageUrl: string; signedFileUrl: string }) => [
      h.signatureImageUrl,
      h.signedFileUrl,
    ]),
  ].filter((url): url is string => !!url);

  if (urls.length > 0) {
    await del(urls).catch(() => {
      // Blob 清不掉也不該擋住刪除這筆紀錄，避免留下殘檔卡住整個刪除流程
    });
  }

  await SignRequest.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
