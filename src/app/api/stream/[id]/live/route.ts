
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'This endpoint is deprecated. Live stream data is now handled directly on the client page.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ message: 'This endpoint is deprecated.' }, { status: 410 });
}
