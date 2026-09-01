import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Vendor from '@/models/Vendor';
import VendorReceipt from '@/models/VendorReceipt';
import { getCurrentUser } from '@/lib/session';
import { parseCsv, findColumn, normalizeDate } from '@/app/lib/csv';

type Params = { params: Promise<{ id: string }> };

// POST /api/vendors/:id/receipts/import - 匯入這個廠商的歷史 CSV（欄位跟匯出格式一致）
// 日期欄有值代表新的一張收據開始，同一張收據後面幾列日期留空即可（跟匯出格式一致）
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

  const body = await request.json().catch(() => null);
  const csv = typeof body?.csv === 'string' ? body.csv : '';
  if (!csv.trim()) {
    return NextResponse.json({ error: '請提供 CSV 內容' }, { status: 400 });
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV 沒有資料列' }, { status: 400 });
  }

  const header = rows[0];
  const col = {
    date: findColumn(header, ['日期', '進貨日期']),
    imageUrl: findColumn(header, ['照片連結', '照片']),
    name: findColumn(header, ['品項']),
    unitPrice: findColumn(header, ['單價']),
    unit: findColumn(header, ['單位']),
    quantity: findColumn(header, ['數量']),
    itemTotal: findColumn(header, ['總額']),
    receiptTotal: findColumn(header, ['單據總額']),
  };

  if (col.date === -1 || col.name === -1) {
    return NextResponse.json({ error: '找不到「日期」或「品項」欄位，請確認 CSV 欄位標題' }, { status: 400 });
  }

  const num = (v: string | undefined) => {
    const n = Number((v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  type Group = { date: string; imageUrl: string; receiptTotal: number; hasExplicitTotal: boolean; items: { name: string; unitPrice: number; unit: string; quantity: number; itemTotal: number }[] };
  const groups: Group[] = [];
  let skipped = 0;

  for (const r of rows.slice(1)) {
    const dateCell = (r[col.date] ?? '').trim();
    const name = (r[col.name] ?? '').trim();
    if (!name) {
      skipped++;
      continue;
    }

    if (dateCell) {
      const normalized = normalizeDate(dateCell);
      if (!normalized) {
        skipped++;
        continue; // 日期格式看不懂，這一列（連同它開的新收據）整列跳過
      }
      groups.push({
        date: normalized,
        imageUrl: col.imageUrl !== -1 ? (r[col.imageUrl] ?? '').trim() : '',
        receiptTotal: 0,
        hasExplicitTotal: false,
        items: [],
      });
    }

    if (groups.length === 0) {
      skipped++;
      continue; // 第一列就沒有日期，沒辦法歸屬到哪張收據
    }

    const current = groups[groups.length - 1];
    current.items.push({
      name,
      unitPrice: col.unitPrice !== -1 ? num(r[col.unitPrice]) : 0,
      unit: col.unit !== -1 ? (r[col.unit] ?? '').trim() : '',
      quantity: col.quantity !== -1 ? num(r[col.quantity]) : 0,
      itemTotal: col.itemTotal !== -1 ? num(r[col.itemTotal]) : 0,
    });

    if (col.receiptTotal !== -1) {
      const rt = (r[col.receiptTotal] ?? '').trim();
      if (rt) {
        current.receiptTotal = num(rt);
        current.hasExplicitTotal = true;
      }
    }
  }

  if (groups.length === 0) {
    return NextResponse.json({ error: '沒有解析到任何有效的收據資料' }, { status: 400 });
  }

  const docs = groups.map((g) => ({
    user: currentUser._id,
    vendor: id,
    date: g.date,
    receiptTotal: g.hasExplicitTotal ? g.receiptTotal : g.items.reduce((sum, it) => sum + it.itemTotal, 0),
    imageUrl: g.imageUrl,
    items: g.items,
  }));

  await VendorReceipt.insertMany(docs);

  return NextResponse.json({
    receiptCount: docs.length,
    itemCount: docs.reduce((sum, d) => sum + d.items.length, 0),
    skippedRows: skipped,
  });
}
