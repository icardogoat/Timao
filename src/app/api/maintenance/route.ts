
// This file is obsolete and has been replaced by /api/settings/route.ts
// to consolidate settings checks into a single API call from the middleware.
// This prevents multiple network requests on each page navigation.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "This endpoint is deprecated. Please use /api/settings.",
  });
}
