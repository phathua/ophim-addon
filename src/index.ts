import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getManifest } from './manifest'
import { handleCatalog } from './catalog'
import { handleMeta } from './meta'
import { handleStream } from './stream'

const app = new Hono()
app.use('*', cors())

app.get('/manifest.json', async (c) => c.json(await getManifest()))

// Wildcard route to handle all Stremio resources
app.get('/*', async (c) => {
    let path = decodeURIComponent(c.req.path)
    console.log(`[Request] Decoded Path: ${path}`)

    if (path === '/manifest.json') return c.json(await getManifest())

    // Catalog: /catalog/:type/:id/:extra?.json
    if (path.startsWith('/catalog/')) {
        let parts = path.substring(9).split('/')
        if (parts.length < 2) return c.json({ metas: [] })

        const type = parts[0]
        let idRaw = parts[1] || ''
        let extraRaw = parts[2] || ''

        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw
        let extra = extraRaw.endsWith('.json') ? extraRaw.slice(0, -5) : extraRaw

        return c.json(await handleCatalog(type, id, extra))
    }

    // Meta: /meta/:type/:id.json
    if (path.startsWith('/meta/')) {
        const metaPath = path.substring(6)
        const parts = metaPath.split('/')
        let type = parts[0]
        let idRaw = parts.length > 1 ? parts[1] : parts[0]
        let id = idRaw.split('.json')[0]

        return c.json(await handleMeta(type, id))
    }

    // Stream: /stream/:type/:id.json
    if (path.startsWith('/stream/')) {
        let parts = path.substring(8).split('/')
        if (parts.length < 2) return c.json({ streams: [] })

        const type = parts[0]
        let idRaw = parts[1] || ''
        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw

        return c.json(await handleStream(type, id))
    }

    return c.text('Not Found', 404)
})

export default app
