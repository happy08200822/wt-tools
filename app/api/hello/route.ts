import { NextResponse } from 'next/server';

let count = 0;

export async function GET() {
  count += 1;
  return NextResponse.json({ message: '歡迎來到這門課', count });
}
