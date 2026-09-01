import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import BizLead from '@/models/BizLead';
import { getCurrentUser } from '@/lib/session';
import { findColumn } from '@/app/lib/csv';

// 貼上的內容可能是從 Excel/Google Sheets 複製（Tab 分隔），也可能是逗號分隔的 CSV，
// 用第一列判斷分隔符號，避免硬用 parseCsv 把 Tab 貼上的資料整列擠成一欄
function splitRows(text: string): string[][] {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
}

// POST /api/biz-leads/import - 貼上表格資料（第一列是標題），一次匯入多筆店家開發名單
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const csv = typeof body?.csv === 'string' ? body.csv : '';
  if (!csv.trim()) {
    return NextResponse.json({ error: '請提供匯入內容' }, { status: 400 });
  }

  const rows = splitRows(csv);
  if (rows.length < 2) {
    return NextResponse.json({ error: '沒有資料列，至少要有標題列 + 一列資料' }, { status: 400 });
  }

  const header = rows[0];
  const nameCol = findColumn(header, ['店名', '名稱', 'name']);
  if (nameCol === -1) {
    return NextResponse.json({ error: '找不到「店名」欄位，請確認 CSV 標題列' }, { status: 400 });
  }
  const categoryCol = findColumn(header, ['類別', '產業別', 'category']);
  const addressCol = findColumn(header, ['地址', 'address']);
  const phoneCol = findColumn(header, ['電話', 'phone']);
  const lineCol = findColumn(header, ['LINE', 'LINE連結', 'line']);
  const igCol = findColumn(header, ['IG', 'Instagram', 'IG連結', 'ig']);
  const fbCol = findColumn(header, ['FB', 'Facebook', 'FB連結', 'fb']);
  const noteCol = findColumn(header, ['備註', 'note']);

  const cell = (r: string[], col: number) => (col === -1 ? '' : (r[col] ?? '').trim());

  let skipped = 0;
  const docs = rows.slice(1).flatMap((r) => {
    const name = cell(r, nameCol);
    if (!name) {
      skipped++;
      return [];
    }
    return [
      {
        user: currentUser._id,
        name,
        category: cell(r, categoryCol),
        address: cell(r, addressCol),
        phone: cell(r, phoneCol),
        lineUrl: cell(r, lineCol),
        igUrl: cell(r, igCol),
        fbUrl: cell(r, fbCol),
        note: cell(r, noteCol),
      },
    ];
  });

  if (docs.length === 0) {
    return NextResponse.json({ error: '沒有解析到任何有效的資料列（至少要有店名）' }, { status: 400 });
  }

  await dbConnect();
  await BizLead.insertMany(docs);

  return NextResponse.json({ importedCount: docs.length, skippedRows: skipped });
}
