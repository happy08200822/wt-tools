import type { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import QuoteLead from '@/models/QuoteLead';
import QuoteLeadClient from './QuoteLeadClient';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    await dbConnect();
    const lead = await QuoteLead.findById(id).select('customerName');
    if (lead?.customerName) {
      return { title: `${lead.customerName} 的報價方案 | ezPretty` };
    }
  } catch {
    // 找不到就用預設標題
  }
  return { title: '報價方案 | ezPretty' };
}

export default async function QuoteLeadPage({ params }: Params) {
  const { id } = await params;
  return <QuoteLeadClient id={id} />;
}
