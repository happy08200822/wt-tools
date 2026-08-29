import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import ContractReview from '@/models/ContractReview';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// GET /api/contracts/:id - 查單筆完整審查結果（只能看自己的）
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
  const review = await ContractReview.findById(id);
  if (!review) {
    return NextResponse.json({ error: '找不到這筆審查紀錄' }, { status: 404 });
  }
  if (review.user.toString() !== currentUser._id) {
    return NextResponse.json({ error: '沒有權限查看這筆紀錄' }, { status: 403 });
  }

  return NextResponse.json(review);
}
