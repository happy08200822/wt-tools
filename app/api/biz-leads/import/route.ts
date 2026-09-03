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
  const addressCol = findColumn(header, ['地址', '城市', 'address']);
  const ownerNameCol = findColumn(header, ['負責人姓名', '負責人', '老闆', 'ownerName']);
  const phoneCol = findColumn(header, ['電話', '聯絡電話', 'phone']);
  const emailCol = findColumn(header, ['email', 'Email', '電子郵件']);
  const lineIdCol = findColumn(header, ['line_id', 'LINE ID', 'LineID']);
  const lineCol = findColumn(header, ['LINE', 'LINE連結', 'line']);
  const igCol = findColumn(header, ['IG', 'Instagram', 'IG連結', 'ig']);
  const fbCol = findColumn(header, ['FB', 'Facebook', 'FB連結', 'fb']);
  const companyStatusCol = findColumn(header, ['業務進度', '公司狀態', '業務狀態']);
  const noteCol = findColumn(header, ['備註', 'note']);

  const cell = (r: string[], col: number) => (col === -1 ? '' : (r[col] ?? '').trim());

  type ImportRow = {
    name: string;
    category: string;
    address: string;
    ownerName: string;
    phone: string;
    email: string;
    lineId: string;
    lineUrl: string;
    igUrl: string;
    fbUrl: string;
    companyStatus: string;
    note: string;
  };

  let skipped = 0;
  const parsedRows: ImportRow[] = rows.slice(1).flatMap((r) => {
    const name = cell(r, nameCol);
    if (!name) {
      skipped++;
      return [];
    }
    return [
      {
        name,
        category: cell(r, categoryCol),
        address: cell(r, addressCol),
        ownerName: cell(r, ownerNameCol),
        phone: cell(r, phoneCol),
        email: cell(r, emailCol),
        lineId: cell(r, lineIdCol),
        lineUrl: cell(r, lineCol),
        igUrl: cell(r, igCol),
        fbUrl: cell(r, fbCol),
        companyStatus: cell(r, companyStatusCol),
        note: cell(r, noteCol),
      },
    ];
  });

  if (parsedRows.length === 0) {
    return NextResponse.json({ error: '沒有解析到任何有效的資料列（至少要有店名）' }, { status: 400 });
  }

  await dbConnect();

  // 有電話號碼的列，用電話比對是否已經存在（同一個人重複貼上不會產生重複名單）；
  // 已存在的只更新聯絡資訊跟公司狀態，不動 status/intentLevel/note，避免蓋掉自己手動追蹤的進度
  const phones = parsedRows.map((r) => r.phone).filter((p) => p !== '');
  const existingLeads = phones.length
    ? await BizLead.find({ user: currentUser._id, phone: { $in: phones } })
    : [];
  const existingByPhone = new Map(existingLeads.map((l) => [l.phone, l]));

  const newDocs: (ImportRow & { user: typeof currentUser._id })[] = [];
  let updatedCount = 0;

  for (const row of parsedRows) {
    const existing = row.phone ? existingByPhone.get(row.phone) : undefined;
    if (existing) {
      existing.set({
        name: row.name,
        category: row.category,
        address: row.address,
        ownerName: row.ownerName,
        email: row.email,
        lineId: row.lineId,
        lineUrl: row.lineUrl,
        igUrl: row.igUrl,
        fbUrl: row.fbUrl,
        ...(row.companyStatus ? { companyStatus: row.companyStatus } : {}),
      });
      await existing.save();
      updatedCount++;
    } else {
      newDocs.push({ user: currentUser._id, ...row });
    }
  }

  if (newDocs.length > 0) {
    await BizLead.insertMany(newDocs);
  }

  return NextResponse.json({
    importedCount: newDocs.length,
    updatedCount,
    skippedRows: skipped,
  });
}
