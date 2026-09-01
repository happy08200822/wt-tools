import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import User from '@/models/User';
import { pushLineMessage } from '@/app/lib/linePush';

type Params = { params: Promise<{ id: string }> };

const CHOICE_LABEL: Record<string, string> = {
  transfer: '匯款',
  card: '刷卡',
};

// POST /api/sign-requests/:id/payment-choice - 公開端點，客戶在簽署完成頁選付款方式時呼叫。
// 只是記錄客戶的意願、推播通知老闆，不會真的產生付款連結（ATM 虛擬帳號、刷卡連結
// 需要老闆自己到後台幫客戶開通，簽約當下還沒有這些資料）
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const choice = body?.choice;
  if (choice !== 'transfer' && choice !== 'card') {
    return NextResponse.json({ error: '付款方式格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const signRequest = await SignRequest.findById(id);
  if (!signRequest) {
    return NextResponse.json({ error: '找不到這份合約' }, { status: 404 });
  }
  if (signRequest.status !== 'signed') {
    return NextResponse.json({ error: '請先完成簽署' }, { status: 400 });
  }

  signRequest.paymentChoice = choice;
  signRequest.paymentChosenAt = new Date();
  await signRequest.save();

  const owner = await User.findById(signRequest.user).select('lineUserId');
  if (owner?.lineUserId) {
    const label = signRequest.customerName || '客戶';
    await pushLineMessage(
      owner.lineUserId,
      `💰 「${label}」選擇了「${CHOICE_LABEL[choice]}」付款方式${choice === 'card' ? '，記得去後台幫他開通刷卡連結' : ''}`
    );
  }

  return NextResponse.json({ paymentChoice: signRequest.paymentChoice, paymentChosenAt: signRequest.paymentChosenAt });
}
