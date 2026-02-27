import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL to prevent arbitrary requests if needed (optional for now)
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    console.log(`Fetching RSS feed: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Flicktopia/1.0; +http://flicktopia.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Upstream error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();

    return new NextResponse(xmlText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300' // Cache for 1 min, stale for 5
      }
    });

  } catch (error) {
    console.error('RSS Proxy Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
