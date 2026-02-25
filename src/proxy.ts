
const OPHIM_IMG_ROOT = 'https://img.ophim1.com/uploads/movies/';
const SECRET_KEY = 42; // Simple XOR key

// Simple XOR Hex Encoder/Decoder
const mask = (str: string) => {
    return Array.from(str).map(c => (c.charCodeAt(0) ^ SECRET_KEY).toString(16).padStart(2, '0')).join('');
}
const unmask = (hex: string) => {
    try {
        return hex.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16) ^ SECRET_KEY)).join('') || '';
    } catch { return ''; }
}

export async function handleProxy(c: any) {
    const segments = c.req.path.split('/');
    // Expected path: /p/i/... or /p/v/[hex] or /p/v/[hex]/[filename.ts]
    const type = segments[2];

    if (type === 'i') {
        const path = c.req.param('path');
        const targetUrl = path.startsWith('http') ? path : `${OPHIM_IMG_ROOT}${path}`;

        const cache = (caches as any).default;
        const cacheKey = new Request(c.req.url);
        let cached = await cache.match(cacheKey);
        if (cached) return cached;

        const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
        });
        let newRes = new Response(res.body, res);
        newRes.headers.set('Access-Control-Allow-Origin', '*');
        newRes.headers.set('Cache-Control', 'public, max-age=2592000');
        c.executionCtx.waitUntil(cache.put(cacheKey, newRes.clone()));
        return newRes;
    }

    if (type === 'v') {
        const hex = c.req.param('hex');
        const file = c.req.param('file');

        let baseUrl = unmask(hex);
        if (!baseUrl) return c.text('Invalid token', 400);

        // If 'file' is present, we are requesting a segment or sub-playlist relative to the master
        if (file) {
            // Construct absolute URL from base and relative path
            const targetUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1) + file;
            console.log(`[Proxy-Redirect] → ${targetUrl}`);
            return c.redirect(targetUrl, 302);
        }

        // If no 'file', we are fetching the master playlist
        console.log(`[Proxy-M3U8] → ${baseUrl}`);
        try {
            const res = await fetch(baseUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
            });

            if (baseUrl.includes('.m3u8') || res.headers.get('content-type')?.includes('mpegurl')) {
                let content = await res.text();

                // Rewrite absolute URLs to go through proxy
                content = content.split('\n').map(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#') && trimmed.startsWith('http')) {
                        return `${new URL(c.req.url).origin}/p/v/${mask(trimmed)}`;
                    }
                    return line;
                }).join('\n');

                return new Response(content, {
                    headers: {
                        'Content-Type': 'application/vnd.apple.mpegurl',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache'
                    }
                });
            }

            return res;
        } catch (e) {
            return c.text('Proxy Error', 500);
        }
    }

    return c.text('Not Found', 404);
}

// Export mask for other files
export { mask };
