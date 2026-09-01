import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import VendorReceipt from '@/models/VendorReceipt';
import { getCurrentUser } from '@/lib/session';

// GET /api/vendors/report?month=YYYY-MM - 依分類彙總這個月每個分類的總支出（對應使用者 Excel 的「各分類支出」表）
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: '請提供正確的 month 參數（YYYY-MM）' }, { status: 400 });
  }

  await dbConnect();

  const rows = await VendorReceipt.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(currentUser._id), date: { $regex: `^${month}` } } },
    { $lookup: { from: 'vendors', localField: 'vendor', foreignField: '_id', as: 'vendorDoc' } },
    { $unwind: '$vendorDoc' },
    {
      $group: {
        _id: '$vendorDoc.category',
        total: { $sum: '$receiptTotal' },
      },
    },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryDoc' } },
    { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        name: { $ifNull: ['$categoryDoc.name', '未分類'] },
        total: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return NextResponse.json({ categories: rows, grandTotal });
}
