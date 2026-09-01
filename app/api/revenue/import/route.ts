import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Revenue from '@/models/Revenue';
import { getCurrentUser } from '@/lib/session';
import { parseCsv, findColumn, normalizeDate } from '@/app/lib/csv';

// POST /api/revenue/import - 匯入歷史營業額 CSV，一列一天，同一天重複出現會覆蓋（upsert）
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
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
  const dateCol = findColumn(header, ['日期', '銷售日期']);
  const amountCol = findColumn(header, ['營業額', '金額']);

  if (dateCol === -1 || amountCol === -1) {
    return NextResponse.json({ error: '找不到「日期」或「營業額」欄位，請確認 CSV 欄位標題' }, { status: 400 });
  }

  const entries: { date: string; amount: number }[] = [];
  let skipped = 0;

  for (const r of rows.slice(1)) {
    const date = normalizeDate(r[dateCol] ?? '');
    const amount = Number((r[amountCol] ?? '').replace(/,/g, ''));
    if (!date || !Number.isFinite(amount)) {
      skipped++;
      continue;
    }
    entries.push({ date, amount });
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: '沒有解析到任何有效的營業額資料' }, { status: 400 });
  }

  await dbConnect();
  await Revenue.bulkWrite(
    entries.map((e) => ({
      updateOne: {
        filter: { user: currentUser._id, date: e.date },
        update: { $set: { amount: e.amount } },
        upsert: true,
      },
    }))
  );

  return NextResponse.json({ importedCount: entries.length, skippedRows: skipped });
}
