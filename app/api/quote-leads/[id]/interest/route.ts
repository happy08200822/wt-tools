import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import QuoteLead from '@/models/QuoteLead';
import User from '@/models/User';
import { pushLineMessage } from '@/app/lib/linePush';

type Params = { params: Promise<{ id: string }> };

// POST /api/quote-leads/:id/interest - 公開端點，客戶在追蹤頁填寫「我要簽約」表單送出時呼叫
// 跟單純的瀏覽通知分開，是更強烈的購買意願訊號，推播內容會附上客戶填寫的簽約資料
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const field = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 200) : '');
  const entry = {
    clickedAt: new Date(),
    selectedPlan: field(body?.selectedPlan),
    companyName: field(body?.companyName),
    contactPerson: field(body?.contactPerson),
    taxId: field(body?.taxId),
    phone: field(body?.phone),
    address: field(body?.address),
  };

  await dbConnect();
  const lead = await QuoteLead.findByIdAndUpdate(id, { $push: { interestClicks: entry } }, { new: true });
  if (!lead) {
    return NextResponse.json({ error: '找不到這份報價' }, { status: 404 });
  }

  const owner = await User.findById(lead.user).select('lineUserId');
  if (owner?.lineUserId) {
    const lines = [
      `🔥 客戶「${lead.customerName}」在報價頁填寫了簽約資料！`,
      entry.selectedPlan && `選擇方案：${entry.selectedPlan}`,
      entry.companyName && `乙方：${entry.companyName}`,
      entry.contactPerson && `代表人：${entry.contactPerson}`,
      entry.taxId && `統一編號：${entry.taxId}`,
      entry.phone && `電話：${entry.phone}`,
      entry.address && `地址：${entry.address}`,
    ].filter(Boolean);
    await pushLineMessage(owner.lineUserId, lines.join('\n'));
  }

  return NextResponse.json({ ok: true });
}
