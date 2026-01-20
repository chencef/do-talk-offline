import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    console.log(`[Proxy] Requesting: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[Proxy] Upstream error: ${response.status} ${response.statusText}`);
            return new NextResponse(`Failed to fetch upstream: ${response.statusText}`, { status: response.status });
        }

        // Forward headers carefully
        const headers = new Headers();
        const allowedHeaders = ['content-type', 'content-length', 'cache-control', 'last-modified', 'etag'];

        response.headers.forEach((value, key) => {
            if (allowedHeaders.includes(key.toLowerCase())) {
                headers.set(key, value);
            }
        });

        headers.set('Access-Control-Allow-Origin', '*');
        // Ensure we don't send compression headers if the fetch already decoded it
        headers.delete('content-encoding');
        headers.delete('transfer-encoding');

        console.log(`[Proxy] Success: ${url}`);
        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error(`[Proxy] Internal Error:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
