import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

const TYPES = ['income', 'expense'];

// GET /api/transactions?userId=xxx&type=expense&page=1&limit=20
export async function GET(request: Request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

  const filter: Record<string, unknown> = {};

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'userId 格式不正確' }, { status: 400 });
    }
    filter.user = userId;
  }

  if (type) {
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: 'type 必須是 income 或 expense' }, { status: 400 });
    }
    filter.type = type;
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email'),
    Transaction.countDocuments(filter),
  ]);

  return NextResponse.json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/transactions
export async function POST(request: Request) {
  await dbConnect();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '請提供有效的 JSON 內容' }, { status: 400 });
  }

  const { user, type, category, amount, date, note } = body;

  if (!user || !mongoose.Types.ObjectId.isValid(user)) {
    return NextResponse.json({ error: '缺少有效的 user' }, { status: 400 });
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'type 必須是 income 或 expense' }, { status: 400 });
  }
  if (!category || typeof category !== 'string') {
    return NextResponse.json({ error: '缺少 category' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount < 0) {
    return NextResponse.json({ error: 'amount 必須是不小於 0 的數字' }, { status: 400 });
  }

  const userExists = await User.exists({ _id: user });
  if (!userExists) {
    return NextResponse.json({ error: '找不到對應的使用者' }, { status: 404 });
  }

  try {
    const transaction = await Transaction.create({
      user,
      type,
      category,
      amount,
      date: date ? new Date(date) : undefined,
      note,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '新增失敗' },
      { status: 500 }
    );
  }
}
