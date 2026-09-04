import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import { notifyContract } from '@/app/lib/lineTargets';
import { ATM_TRANSFER_LIMIT } from '@/app/lib/paymentConfig';

type Params = { params: Promise<{ id: string }> };

const CHOICE_LABEL: Record<string, string> = {
  transfer: '匯款',
  atm: 'ATM 虛擬帳號',
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
  if (choice !== 'transfer' && choice !== 'atm' && choice !== 'card') {
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

  // ATM 轉帳本身在銀行端有金額上限，達到門檻的金額客戶用 ATM 根本轉不出去，
  // 所以達門檻只能選匯款；反過來未達門檻的金額公司政策不收直接匯款，只能選 ATM 或刷卡。
  // UI 上本來就只會顯示合法的選項，這裡是防止有人繞過畫面直接打 API
  if (typeof signRequest.paymentAmount === 'number') {
    if (choice === 'atm' && signRequest.paymentAmount >= ATM_TRANSFER_LIMIT) {
      return NextResponse.json({ error: '此金額超過 ATM 轉帳上限，請改選匯款' }, { status: 400 });
    }
    if (choice === 'transfer' && signRequest.paymentAmount < ATM_TRANSFER_LIMIT) {
      return NextResponse.json({ error: '此金額請選擇 ATM 或刷卡付款' }, { status: 400 });
    }
  }

  signRequest.paymentChoice = choice;
  signRequest.paymentChosenAt = new Date();
  await signRequest.save();

  const label = signRequest.customerName || '客戶';
  await notifyContract(
    `💰 「${label}」選擇了「${CHOICE_LABEL[choice]}」付款方式${choice !== 'transfer' ? '，記得去後台幫他開通' : ''}`,
    signRequest.user?.toString()
  );

  return NextResponse.json({ paymentChoice: signRequest.paymentChoice, paymentChosenAt: signRequest.paymentChosenAt });
}
