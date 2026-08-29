import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';

const TYPES = ['income', 'expense'];

type Params = { params: Promise<{ id: string }> };

// GET /api/transactions/:id
export async function GET(_request: Request, { params }: Params) {
  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const transaction = await Transaction.findById(id).populate('user', 'name email');
  if (!transaction) {
    return NextResponse.json({ error: '找不到這筆記帳紀錄' }, { status: 404 });
  }

  return NextResponse.json(transaction);
}

// PATCH /api/transactions/:id
export async function PATCH(request: Request, { params }: Params) {
  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '請提供有效的 JSON 內容' }, { status: 400 });
  }

  const { type, category, amount, date, note } = body;
  const update: Record<string, unknown> = {};

  if (type !== undefined) {
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: 'type 必須是 income 或 expense' }, { status: 400 });
    }
    update.type = type;
  }
  if (category !== undefined) {
    if (typeof category !== 'string' || !category.trim()) {
      return NextResponse.json({ error: 'category 不可為空' }, { status: 400 });
    }
    update.category = category;
  }
  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'amount 必須是不小於 0 的數字' }, { status: 400 });
    }
    update.amount = amount;
  }
  if (date !== undefined) update.date = new Date(date);
  if (note !== undefined) update.note = note;

  // user 刻意不開放修改，記帳紀錄不應該換擁有者

  try {
    const transaction = await Transaction.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email');

    if (!transaction) {
      return NextResponse.json({ error: '找不到這筆記帳紀錄' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '更新失敗' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/:id
export async function DELETE(_request: Request, { params }: Params) {
  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const transaction = await Transaction.findByIdAndDelete(id);
  if (!transaction) {
    return NextResponse.json({ error: '找不到這筆記帳紀錄' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
