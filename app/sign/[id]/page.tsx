import type { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import SignRequest from '@/models/SignRequest';
import SignClient from './SignClient';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    await dbConnect();
    const signRequest = await SignRequest.findById(id).select('customerName');
    if (signRequest?.customerName) {
      return { title: `${signRequest.customerName} 的合約簽署 | ezPretty` };
    }
  } catch {
    // 找不到就用預設標題
  }
  return { title: '合約簽署 | ezPretty' };
}

export default async function SignPage({ params }: Params) {
  const { id } = await params;
  return <SignClient id={id} />;
}
