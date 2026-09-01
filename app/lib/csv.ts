// 簡易 CSV 解析器，處理雙引號包住的欄位、逗號、換行、"" 轉義引號，也會自動去掉開頭的 BOM
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // 忽略，交給 \n 結束一列
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// 依標題名稱找欄位索引，容忍多種常見別名
export function findColumn(header: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = header.findIndex((h) => h.trim() === alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

// 把常見的日期格式（2026/7/1、2026-7-1、2026.7.1、2026-07-01...）統一正規化成 YYYY-MM-DD，
// 不然存進去的字串會跟系統其他地方用 YYYY-MM 比對月份的邏輯對不上，篩選月份時就會找不到資料
export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const mm = m.padStart(2, '0');
  const dd = d.padStart(2, '0');
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return `${y}-${mm}-${dd}`;
}
