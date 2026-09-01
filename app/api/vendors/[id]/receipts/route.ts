import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Vendor from '@/models/Vendor';
import VendorReceipt from '@/models/VendorReceipt';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 4 * 1024 * 1024; // 4MB，跟 /api/receipts 一致（Vercel 平台請求大小上限約 4.5MB）

// GET /api/vendors/:id/receipts - 列出這個廠商已存檔的收據紀錄
// ?month=YYYY-MM 只回傳該月份的資料（不分頁，通常量不大）
// 不帶 month 就是「全部」，用 ?skip=&limit= 分頁（預設 limit 20）
export async function GET(request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month'); // 'YYYY-MM'
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const skip = Math.max(0, Number(url.searchParams.get('skip')) || 0);

  await dbConnect();

  const filter: Record<string, unknown> = { vendor: id, user: currentUser._id };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    filter.date = { $regex: `^${month}` };
  }

  const query = VendorReceipt.find(filter).sort({ date: -1, createdAt: -1 });
  if (!month) {
    query.skip(skip).limit(limit + 1); // 多抓一筆，用來判斷還有沒有下一頁
  }

  const results = await query;
  const hasMore = !month && results.length > limit;
  const items = !month && hasMore ? results.slice(0, limit) : results;

  return NextResponse.json({ items, hasMore });
}

// POST /api/vendors/:id/receipts - 使用者確認辨識結果後，存檔（含上傳照片到 Blob）
export async function POST(request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const vendor = await Vendor.findOne({ _id: id, user: currentUser._id });
  if (!vendor) {
    return NextResponse.json({ error: '找不到這個廠商' }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file'); // 手動新增（沒有收據照片）時可以不帶
  const payload = formData?.get('data');

  if (file && file instanceof File && file.size > MAX_BYTES) {
    return NextResponse.json({ error: '照片太大，請上傳 4MB 以下的檔案' }, { status: 400 });
  }
  if (typeof payload !== 'string') {
    return NextResponse.json({ error: '缺少收據資料' }, { status: 400 });
  }

  let parsed: {
    date?: string;
    receiptTotal?: number;
    items?: { name: string; unitPrice: number; unit: string; quantity: number; itemTotal: number }[];
    usage?: { inputTokens?: number; outputTokens?: number; costUsd?: number };
  };
  try {
    parsed = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: '收據資料格式不正確' }, { status: 400 });
  }

  if (!parsed.date || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    return NextResponse.json({ error: '收據資料不完整' }, { status: 400 });
  }

  let imageUrl = '';
  if (file && file instanceof File) {
    try {
      const blob = await put(file.name, file, { access: 'public', addRandomSuffix: true, contentType: file.type });
      imageUrl = blob.url;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? `照片上傳失敗：${err.message}` : '照片上傳失敗' },
        { status: 500 }
      );
    }
  }

  const receipt = await VendorReceipt.create({
    user: currentUser._id,
    vendor: id,
    date: parsed.date,
    receiptTotal: parsed.receiptTotal ?? 0,
    imageUrl,
    items: parsed.items,
    inputTokens: parsed.usage?.inputTokens ?? 0,
    outputTokens: parsed.usage?.outputTokens ?? 0,
    costUsd: parsed.usage?.costUsd ?? 0,
  });

  return NextResponse.json(receipt, { status: 201 });
}
