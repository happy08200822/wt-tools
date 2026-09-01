import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import VendorReceipt from '@/models/VendorReceipt';
import { getCurrentUser } from '@/lib/session';

// GET /api/vendors/report/vendors?month=YYYY-MM&categoryId=xxx - 展開某個分類，列出底下各廠商這個月的支出
// categoryId 不帶或帶 'none' 代表查「未分類」的廠商
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  const categoryId = url.searchParams.get('categoryId');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: '請提供正確的 month 參數（YYYY-MM）' }, { status: 400 });
  }
  if (categoryId && categoryId !== 'none' && !mongoose.Types.ObjectId.isValid(categoryId)) {
    return NextResponse.json({ error: 'categoryId 格式不正確' }, { status: 400 });
  }

  await dbConnect();

  const categoryMatch =
    categoryId && categoryId !== 'none' ? new mongoose.Types.ObjectId(categoryId) : null;

  const rows = await VendorReceipt.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(currentUser._id), date: { $regex: `^${month}` } } },
    { $lookup: { from: 'vendors', localField: 'vendor', foreignField: '_id', as: 'vendorDoc' } },
    { $unwind: '$vendorDoc' },
    { $match: { 'vendorDoc.category': categoryMatch } },
    {
      $group: {
        _id: '$vendorDoc._id',
        name: { $first: '$vendorDoc.name' },
        total: { $sum: '$receiptTotal' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $project: { _id: 0, vendorId: '$_id', name: 1, total: 1, count: 1 } },
  ]);

  return NextResponse.json(rows);
}
