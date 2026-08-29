import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import QuoteLead from '@/models/QuoteLead';

type Params = { params: Promise<{ id: string }> };

// GET /api/quote-leads/:id - 公開端點，給客戶開啟的報價追蹤頁用，只回傳頁面要顯示的內容
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const lead = await QuoteLead.findById(id).select('customerName accentColor plans');
  if (!lead) {
    return NextResponse.json({ error: '找不到這份報價' }, { status: 404 });
  }

  return NextResponse.json({
    customerName: lead.customerName,
    accentColor: lead.accentColor,
    plans: lead.plans,
  });
}
