
import { getSiteSettings } from '@/actions/settings-actions';
import { NextResponse } from 'next/server';

// This route is designed to be called from the middleware.
// Setting revalidate to 0 disables caching for this route, ensuring the status is always fresh.
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('API route /api/settings failed:', error);
    // In case of a database error, default to all modes being off to prevent locking out the entire site.
    return NextResponse.json({ maintenanceMode: false, betaVipMode: false }, { status: 500 });
  }
}
