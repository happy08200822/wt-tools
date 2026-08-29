import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import QuoteLead from '@/models/QuoteLead';

type Params = { params: Promise<{ id: string; visitId: string }> };

// POST /api/quote-leads/:id/visit/:visitId - 公開端點，回報這次瀏覽的停留秒數
// 用 POST 而不是 PATCH，是因為前端用 navigator.sendBeacon() 在使用者離開頁面時回報，sendBeacon 只能送 POST
export async function POST(request: Request, { params }: Params) {
  const { id, visitId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(visitId)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const durationSec = Number(body?.durationSec);
  if (!Number.isFinite(durationSec) || durationSec < 0) {
    return NextResponse.json({ error: 'durationSec 不正確' }, { status: 400 });
  }

  await dbConnect();
  await QuoteLead.updateOne(
    { _id: id, 'visits._id': visitId },
    { $set: { 'visits.$.durationSec': Math.round(durationSec) } }
  );

  return NextResponse.json({ ok: true });
}
