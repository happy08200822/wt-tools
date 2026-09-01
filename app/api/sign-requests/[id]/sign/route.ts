import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import User from '@/models/User';
import { pushLineMessage } from '@/app/lib/linePush';

type Params = { params: Promise<{ id: string }> };

// 純 ASCII 格式（YYYY-MM-DD HH:mm:ss），避免用 toLocaleString 產生 pdf-lib 標準字型畫不出來的字元
function formatTaipeiTimestamp(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

// GET /api/sign-requests/:id/sign - 公開端點，給客戶開啟的簽署頁用，只回傳頁面要顯示的內容
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const signRequest = await SignRequest.findById(id).select(
    'fileName fileUrl customerName status signedAt signedFileUrl'
  );
  if (!signRequest) {
    return NextResponse.json({ error: '找不到這份合約' }, { status: 404 });
  }

  return NextResponse.json({
    fileName: signRequest.fileName,
    fileUrl: signRequest.fileUrl,
    customerName: signRequest.customerName,
    status: signRequest.status,
    signedAt: signRequest.signedAt,
    signedFileUrl: signRequest.signedFileUrl,
  });
}

// POST /api/sign-requests/:id/sign - 公開端點，客戶在簽署頁畫完簽名送出時呼叫
// 把簽名疊到合約最後新增的一頁，產生已簽署版 PDF，並推播通知老闆
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const signatureDataUrl = typeof body?.signatureDataUrl === 'string' ? body.signatureDataUrl : '';

  if (!signatureDataUrl.startsWith('data:image/png;base64,')) {
    return NextResponse.json({ error: '請先簽名' }, { status: 400 });
  }

  await dbConnect();
  const signRequest = await SignRequest.findById(id);
  if (!signRequest) {
    return NextResponse.json({ error: '找不到這份合約' }, { status: 404 });
  }
  if (signRequest.status === 'signed') {
    return NextResponse.json({ error: '這份合約已經簽署過了' }, { status: 409 });
  }

  const signatureBuffer = Buffer.from(signatureDataUrl.split(',')[1], 'base64');

  let signatureBlob;
  try {
    signatureBlob = await put(`signature-${id}.png`, signatureBuffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'image/png',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `簽名儲存失敗：${err.message}` : '簽名儲存失敗' },
      { status: 500 }
    );
  }

  const signedAt = new Date();

  let signedPdfBytes: Uint8Array;
  try {
    const originalRes = await fetch(signRequest.fileUrl);
    if (!originalRes.ok) throw new Error('無法讀取原始合約檔案');
    const originalBytes = await originalRes.arrayBuffer();

    const pdfDoc = await PDFDocument.load(originalBytes);
    // StandardFonts 只支援 WinAnsi 編碼、不能畫中文字，簽署人姓名等中文內容已經在
    // 客戶端合成進 signatureImage 這張圖裡了，這裡只用 ASCII 文字，避免整個請求噴錯
    const signatureImage = await pdfDoc.embedPng(signatureBuffer);

    const hasPosition =
      typeof signRequest.signatureX === 'number' &&
      typeof signRequest.signatureY === 'number' &&
      typeof signRequest.signatureWidth === 'number' &&
      typeof signRequest.signatureHeight === 'number';

    if (hasPosition) {
      // 老闆有在合約最後一頁拖曳畫過框：直接貼在原始合約上，不新增頁面。
      // 簽名等比例縮放到剛好放進框裡（不拉伸變形），再置中對齊，
      // 不管客戶簽名筆跡多大多小，視覺上都會剛好符合老闆框選的範圍
      const boxX = signRequest.signatureX!;
      const boxY = signRequest.signatureY!;
      const boxWidth = signRequest.signatureWidth!;
      const boxHeight = signRequest.signatureHeight!;
      const page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
      const sigDims = signatureImage.scaleToFit(boxWidth, boxHeight);
      page.drawImage(signatureImage, {
        x: boxX + (boxWidth - sigDims.width) / 2,
        y: boxY + (boxHeight - sigDims.height) / 2,
        width: sigDims.width,
        height: sigDims.height,
      });
    } else {
      // 保底邏輯：老闆沒有選位置，新增一頁把簽名貼上去
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      page.drawText('Signature Confirmation', { x: 50, y: height - 80, size: 20, font, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(`Signed at: ${formatTaipeiTimestamp(signedAt)} (UTC+8)`, {
        x: 50,
        y: height - 110,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });

      const sigDims = signatureImage.scaleToFit(width - 100, 240);
      page.drawImage(signatureImage, {
        x: 50,
        y: height - 150 - sigDims.height,
        width: sigDims.width,
        height: sigDims.height,
      });
    }

    signedPdfBytes = await pdfDoc.save();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `合約產生失敗：${err.message}` : '合約產生失敗' },
      { status: 500 }
    );
  }

  let signedPdfBlob;
  try {
    signedPdfBlob = await put(`signed-${signRequest.fileName}`, Buffer.from(signedPdfBytes), {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'application/pdf',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `已簽署合約上傳失敗：${err.message}` : '已簽署合約上傳失敗' },
      { status: 500 }
    );
  }

  signRequest.status = 'signed';
  signRequest.signatureImageUrl = signatureBlob.url;
  signRequest.signedAt = signedAt;
  signRequest.signedFileUrl = signedPdfBlob.url;
  signRequest.signedFileSize = signedPdfBytes.byteLength;
  await signRequest.save();

  const owner = await User.findById(signRequest.user).select('lineUserId');
  if (owner?.lineUserId) {
    const label = signRequest.customerName || '客戶';
    await pushLineMessage(
      owner.lineUserId,
      `✅ 「${label}」已完成合約電子簽署！\n${signedPdfBlob.url}`
    );
  }

  return NextResponse.json({
    status: signRequest.status,
    signedAt: signRequest.signedAt,
    signedFileUrl: signRequest.signedFileUrl,
  });
}
