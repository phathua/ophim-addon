
const OPHIM_IMG_ROOT = 'https://img.ophim1.com/uploads/movies/';

export async function handleProxy(c: any) {
    const type = c.req.path.split('/')[2]; // 'i' for image, 's' for stream
    let targetUrl = '';

    if (type === 'i') {
        const path = c.req.param('path');
        targetUrl = path.startsWith('http') ? path : `${OPHIM_IMG_ROOT}${path}`;
    } else if (type === 's') {
        const b64 = c.req.param('b64');
        try {
            targetUrl = atob(b64);
        } catch (e) {
            return c.text('Invalid encoding', 400);
        }
    } else {
        // Fallback for query params
        const url = c.req.query('url');
        if (!url) return c.text('Missing URL', 400);
        targetUrl = url.startsWith('http') ? url : atob(url);
    }

    console.log(`[Proxy] Target: ${targetUrl}`);

    const cache = (caches as any).default;
    const cacheKey = new Request(c.req.url);

    if (type === 'i') {
        let response = await cache.match(cacheKey);
        if (response) return response;
    }

    try {
        const headers: any = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        // Add Referer for m3u8 if it's from known sources that need it
        if (type === 's') {
            // Basic dummy headers
            headers['Referer'] = new URL(targetUrl).origin;
        }

        const res = await fetch(targetUrl, { headers });

        // Clone the response to modify headers and cache it
        let newResponse = new Response(res.body, res);

        // Universal headers
        newResponse.headers.set('Access-Control-Allow-Origin', '*');

        if (type === 'i') {
            // Set long cache duration for images
            newResponse.headers.set('Cache-Control', 'public, max-age=2592000'); // 30 days
            c.executionCtx.waitUntil(cache.put(cacheKey, newResponse.clone()));
        } else {
            // No cache for m3u8 to keep it fresh
            newResponse.headers.set('Cache-Control', 'no-cache');
        }

        return newResponse;
    } catch (e) {
        console.error(`[Proxy] Error:`, e);
        return c.text('Proxy Error', 500);
    }
}
