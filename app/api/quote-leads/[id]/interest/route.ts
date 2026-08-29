import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import QuoteLead from '@/models/QuoteLead';
import User from '@/models/User';
import { pushLineMessage } from '@/app/lib/linePush';

type Params = { params: Promise<{ id: string }> };

// POST /api/quote-leads/:id/interest - 公開端點，客戶按下追蹤頁的「我要簽約」CTA 時呼叫
// 跟單純的瀏覽通知分開，是更強烈的購買意願訊號，推播文字也不同
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const lead = await QuoteLead.findByIdAndUpdate(
    id,
    { $push: { interestClicks: { clickedAt: new Date() } } },
    { new: true }
  );
  if (!lead) {
    return NextResponse.json({ error: '找不到這份報價' }, { status: 404 });
  }

  const owner = await User.findById(lead.user).select('lineUserId');
  if (owner?.lineUserId) {
    await pushLineMessage(
      owner.lineUserId,
      `🔥 客戶「${lead.customerName}」在報價頁點擊了「我要簽約」！這是明確的購買意願，建議盡快聯繫。`
    );
  }

  return NextResponse.json({ ok: true });
}
