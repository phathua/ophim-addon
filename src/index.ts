import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getManifest } from './manifest'
import { handleCatalog } from './catalog'
import { handleMeta } from './meta'
import { handleStream } from './stream'
import { handleProxy } from './proxy'
import { getConfigureHtml } from './configure'

const app = new Hono()
app.use('*', cors())

// Redirect root to configure
app.get('/', (c) => c.redirect('/configure'))

// Serve configuration page
app.get('/configure', (c) => c.html(getConfigureHtml(c.req.url)))

app.get('/manifest.json', async (c) => {
    const catalogParam = c.req.query('catalogs') || ''
    return c.json(await getManifest(catalogParam))
})
app.get('/p/i/:path{.+}', (c) => handleProxy(c)) // Proxy Image
app.get('/p/v/:hex/:file{.+}', (c) => handleProxy(c)) // Proxy Video Segments
app.get('/p/v/:hex', (c) => handleProxy(c))           // Proxy Master Playlist
app.get('/proxy', (c) => handleProxy(c))         // Legacy/Query Proxy

// Wildcard route to handle all Stremio resources
app.get('/*', async (c) => {
    let path = decodeURIComponent(c.req.path)
    console.log(`[Request] Decoded Path: ${path}`)

    if (path === '/manifest.json') {
        const catalogParam = c.req.query('catalogs') || ''
        return c.json(await getManifest(catalogParam))
    }

    // Catalog: /catalog/:type/:id/:extra?.json
    if (path.startsWith('/catalog/')) {
        let parts = path.substring(9).split('/')
        if (parts.length < 2) return c.json({ metas: [] })

        const type = parts[0]
        let idRaw = parts[1] || ''
        let extraRaw = parts[2] || ''

        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw
        let extra = extraRaw.endsWith('.json') ? extraRaw.slice(0, -5) : extraRaw

        const origin = new URL(c.req.url).origin
        return c.json(await handleCatalog(type, id, extra, origin))
    }

    // Meta: /meta/:type/:id.json
    if (path.startsWith('/meta/')) {
        const metaPath = path.substring(6)
        const parts = metaPath.split('/')
        let type = parts[0]
        let idRaw = parts.length > 1 ? parts[1] : parts[0]
        let id = idRaw.split('.json')[0]

        const origin = new URL(c.req.url).origin
        return c.json(await handleMeta(type, id, origin))
    }

    // Stream: /stream/:type/:id.json
    if (path.startsWith('/stream/')) {
        let parts = path.substring(8).split('/')
        if (parts.length < 2) return c.json({ streams: [] })

        const type = parts[0]
        let idRaw = parts[1] || ''
        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw

        const origin = new URL(c.req.url).origin
        return c.json(await handleStream(type, id, origin))
    }

    return c.text('Not Found', 404)
})

export default app
