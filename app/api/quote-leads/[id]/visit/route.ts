import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import QuoteLead from '@/models/QuoteLead';
import User from '@/models/User';
import { pushLineMessage } from '@/app/lib/linePush';

type Params = { params: Promise<{ id: string }> };

// POST /api/quote-leads/:id/visit - 公開端點，客戶開啟報價追蹤頁時呼叫，記錄一次瀏覽並推播通知業務
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const lead = await QuoteLead.findByIdAndUpdate(
    id,
    { $push: { visits: { visitedAt: new Date(), durationSec: 0 } } },
    { new: true }
  );
  if (!lead) {
    return NextResponse.json({ error: '找不到這份報價' }, { status: 404 });
  }

  const visitIndex = lead.visits.length - 1;
  const visit = lead.visits[visitIndex];
  const visitCount = lead.visits.length;

  const owner = await User.findById(lead.user).select('lineUserId');
  if (owner?.lineUserId) {
    const text =
      visitCount === 1
        ? `📄 客戶「${lead.customerName}」開啟了報價頁面！`
        : `🔁 客戶「${lead.customerName}」再次查看報價頁面（第 ${visitCount} 次）`;
    await pushLineMessage(owner.lineUserId, text);
  }

  return NextResponse.json({ visitId: visit._id, visitCount });
}
