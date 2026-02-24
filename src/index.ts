import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('*', cors())

let GENRES: { name: string, slug: string }[] = []
let COUNTRIES: { name: string, slug: string }[] = []
let lastMetaUpdate = 0
const META_CACHE_TTL = 3600000 // 1 hour

async function ensureMetadata() {
    if (GENRES.length > 0 && COUNTRIES.length > 0 && (Date.now() - lastMetaUpdate < META_CACHE_TTL)) {
        return
    }

    try {
        console.log('[Metadata] Refreshing genres and countries...')
        const [genreRes, countryRes] = await Promise.all([
            fetch('https://ophim1.com/v1/api/the-loai'),
            fetch('https://ophim1.com/v1/api/quoc-gia')
        ])

        const genreData: any = await genreRes.json()
        const countryData: any = await countryRes.json()

        if (genreData.status === 'success') {
            GENRES = genreData.data.items.map((i: any) => ({ name: i.name, slug: i.slug }))
        }
        if (countryData.status === 'success') {
            COUNTRIES = countryData.data.items.map((i: any) => ({ name: i.name, slug: i.slug }))
        }

        lastMetaUpdate = Date.now()
        console.log(`[Metadata] Updated: ${GENRES.length} genres, ${COUNTRIES.length} countries`)
    } catch (e) {
        console.error('[Metadata] Failed to catch dynamic metadata, using fallbacks', e)
        // Fallbacks if both are empty
        if (GENRES.length === 0) {
            GENRES = [{ name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Tình Cảm', slug: 'tinh-cam' }, { name: 'Hài Hước', slug: 'hai-huoc' }]
        }
        if (COUNTRIES.length === 0) {
            COUNTRIES = [{ name: 'Âu Mỹ', slug: 'au-my' }, { name: 'Hàn Quốc', slug: 'han-quoc' }, { name: 'Trung Quốc', slug: 'trung-quoc' }]
        }
    }
}

async function getManifest() {
    await ensureMetadata()
    const EXTRA_CATALOG = [
        { name: 'genre', options: GENRES.map(g => g.name), isRequired: false },
        { name: 'country', options: COUNTRIES.map(c => c.name), isRequired: false }
    ]

    const EXTRA_SEARCH = [
        { name: 'search', isRequired: true }
    ]

    return {
        id: 'com.vibe.ophim.pro',
        name: 'OPhim Stremio Addon',
        version: '1.3.2',
        description: 'Addon xem phim từ OPhim với đầy đủ danh mục, thể loại và quốc gia cập nhật tự động.',
        resources: [
            { name: 'catalog', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
            { name: 'meta', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
            { name: 'stream', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:', 'tt'] }
        ],
        types: ['movie', 'series', 'anime', 'tv'],
        catalogs: [
            { type: 'movie', id: 'ophim_search', name: 'OPhim - Tìm kiếm', extra: EXTRA_SEARCH },
            { type: 'series', id: 'ophim_search', name: 'OPhim - Tìm kiếm', extra: EXTRA_SEARCH },
            { type: 'movie', id: 'ophim_phim-moi', name: 'OPhim - Phim Mới', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_phim-bo', name: 'OPhim - Phim Bộ', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-le', name: 'OPhim - Phim Lẻ', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_tv-shows', name: 'OPhim - Shows', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_hoat-hinh', name: 'OPhim - Hoạt Hình', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-vietsub', name: 'OPhim - Vietsub', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-thuyet-minh', name: 'OPhim - Thuyết Minh', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-long-tien', name: 'OPhim - Lồng Tiếng', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_phim-bo-dang-chieu', name: 'OPhim - Bộ Đang Chiếu', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_phim-bo-hoan-thanh', name: 'OPhim - Bộ Hoàn Thành', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-sap-chieu', name: 'OPhim - Sắp Chiếu', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_subteam', name: 'OPhim - Subteam', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-chieu-rap', name: 'OPhim - Chiếu Rạp', extra: EXTRA_CATALOG }
        ],
        idPrefixes: ['ophim:', 'tt']
    }
}


// Simple in-memory cache for IMDB to slug mapping
const imdbCache = new Map<string, string>()

async function getSlugFromImdb(imdbId: string, type: string, season?: number): Promise<string | null> {
    const cacheKey = (type === 'series' && season) ? `${imdbId}:${season}` : imdbId
    if (imdbCache.has(cacheKey)) return imdbCache.get(cacheKey)!

    try {
        console.log(`[Mapping] Finding OPhim slug for IMDB: ${imdbId} (${type}, S${season || 1})`)

        // 1. Search OPhim by IMDB ID
        const searchRes = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${imdbId}&limit=10`)
        const searchData: any = await searchRes.json()
        const items = searchData.data?.items || []

        // 2. Fetch details for candidates and verify tmdb.season + imdb.id
        const detailPromises = items.map(async (item: any) => {
            try {
                const res = await fetch(`https://ophim1.com/v1/api/phim/${item.slug}`)
                const data: any = await res.json()
                return { slug: item.slug, detail: data.data?.item }
            } catch (e) { return null }
        })

        const candidates = (await Promise.all(detailPromises)).filter(c => c && c.detail)

        // Priority 1: Exact IMDB ID + Match Season (if series)
        for (const cand of candidates as any[]) {
            const detail = cand.detail
            if (detail.imdb?.id === imdbId) {
                if (type === 'series' && season) {
                    if (detail.tmdb?.season === season) {
                        console.log(`[Mapping] Exact Match (IMDB+Season): ${cand.slug}`)
                        imdbCache.set(cacheKey, cand.slug)
                        return cand.slug
                    }
                } else {
                    console.log(`[Mapping] Exact Match (IMDB): ${cand.slug}`)
                    imdbCache.set(cacheKey, cand.slug)
                    return cand.slug
                }
            }
        }

        // Priority 2: Fallback to title-based matching if IMDB ID check failed but found candidates
        if (type === 'series' && season) {
            const sStr = season.toString()
            const fallback = items.find((item: any) => {
                const name = item.name.toLowerCase()
                return name.includes(`phần ${sStr}`) || name.includes(`season ${sStr}`) || name.includes(` s${sStr}`)
            })
            if (fallback) {
                console.log(`[Mapping] Fallback Match (Title-based): ${fallback.slug}`)
                imdbCache.set(cacheKey, fallback.slug)
                return fallback.slug
            }
        }

        // Final fallback: First result
        if (items.length > 0) {
            console.log(`[Mapping] Final Fallback (First result): ${items[0].slug}`)
            return items[0].slug
        }

    } catch (e) {
        console.error(`[Mapping] Error mapping IMDB ${imdbId}:`, e)
    }
    return null
}

// Global Image Base
const IMG_BASE = 'https://img.ophim1.com/uploads/movies/'

app.get('/manifest.json', async (c) => c.json(await getManifest()))

// The most robust wildcard route
app.get('/*', async (c) => {
    let path = decodeURIComponent(c.req.path)
    console.log(`[Request] Decoded Path: ${path}`)

    if (path === '/manifest.json') return c.json(await getManifest())

    // Catalog: /catalog/:type/:id/:extra?.json
    if (path.startsWith('/catalog/')) {
        let parts = path.substring(9).split('/')
        const type = parts[0]
        let idRaw = parts[1] || ''
        let extraRaw = parts[2] || ''

        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw
        let extra = extraRaw.endsWith('.json') ? extraRaw.slice(0, -5) : extraRaw

        console.log(`[Catalog] Parsed: type=${type}, id=${id}, extra=${extra}`)

        await ensureMetadata()
        let searchQuery = '', genreSlug = '', countrySlug = ''
        if (extra) {
            extra.split('&').forEach(p => {
                const [k, v] = p.split('=')
                if (k === 'search') searchQuery = v
                if (k === 'genre') genreSlug = GENRES.find(g => g.name === v)?.slug || ''
                if (k === 'country') countrySlug = COUNTRIES.find(c => c.name === v)?.slug || ''
            })
        }

        let apiUrl = ''
        if (searchQuery) {
            apiUrl = `https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchQuery)}&page=1`
        } else if (id && id !== 'ophim_search') {
            apiUrl = `https://ophim1.com/v1/api/danh-sach/${id.replace('ophim_', '')}?page=1`
            if (genreSlug) apiUrl += `&category=${genreSlug}`
            if (countrySlug) apiUrl += `&country=${countrySlug}`
        } else {
            apiUrl = 'https://ophim1.com/v1/api/danh-sach/phim-moi?page=1'
        }

        try {
            const res = await fetch(apiUrl)
            const result: any = await res.json()
            const metas = (result.data.items || []).map((item: any) => ({
                id: `ophim:${item.slug}`,
                type: (item.type === 'series' || item.episodes_count > 1) ? 'series' : 'movie',
                name: item.name,
                poster: item.thumb_url.startsWith('http') ? item.thumb_url.replace('img.ophim.cc', 'img.ophim1.com') : `${IMG_BASE}${item.thumb_url}`,
                description: `${item.origin_name} (${item.year})`,
                releaseInfo: item.year?.toString(),
                imdbRating: (item.imdb?.vote_average || item.tmdb?.vote_average)?.toString()
            }))
            return c.json({ metas })
        } catch (e) {
            return c.json({ metas: [] })
        }
    }

    // Meta: /meta/:type/:id.json
    if (path.startsWith('/meta/')) {
        const metaPath = path.substring(6)
        const parts = metaPath.split('/')
        // Handles: /meta/movie/id.json OR /meta/id.json
        let idRaw = parts.length > 1 ? parts[1] : parts[0]
        let id = idRaw.split('.json')[0] // more robust than slice

        console.log(`[Meta] Path: ${path}, Extracted ID: ${id}`)
        const slug = id.includes(':') ? id.split(':')[1] : id
        console.log(`[Meta] Using Slug: ${slug}`)

        try {
            const res = await fetch(`https://ophim1.com/v1/api/phim/${slug}`)
            const result: any = await res.json()
            const item = result.data.item
            if (!item) return c.json({ meta: {} })

            const fix = (u: string) => !u ? '' : (u.startsWith('http') ? u.replace('img.ophim.cc', 'img.ophim1.com') : `${IMG_BASE}${u}`)

            // Helper to extract YouTube ID
            const getYoutubeId = (url: string) => {
                if (!url) return null
                const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
                const match = url.match(regex)
                return match ? match[1] : null
            }

            const meta: any = {
                id: `ophim:${item.slug}`,
                type: (item.type === 'series' || item.type === 'hoat-hinh' || (item.episodes && item.episodes[0]?.server_data.length > 1)) ? 'series' : 'movie',
                name: item.name,
                poster: fix(item.thumb_url),
                background: fix(item.poster_url),
                description: item.content ? item.content.replace(/<[^>]*>?/gm, '') : '',
                releaseInfo: item.year?.toString(),
                released: item.created?.time || (item.year ? new Date(item.year, 0, 1).toISOString() : undefined),
                runtime: item.time,
                country: item.country?.[0]?.name || '',
                genres: item.category?.map((cat: any) => cat.name) || [],
                director: item.director || [],
                cast: item.actor || [],
                trailers: getYoutubeId(item.trailer_url) ? [{ source: getYoutubeId(item.trailer_url), type: 'Trailer' }] : [],
                imdbRating: undefined,
                imdb_id: undefined
            }

            // Extract IDs and Rating from item with fallback
            const rawImdbId = item.imdb?.id || item.tmdb?.imdb_id
            if (rawImdbId) meta.imdb_id = rawImdbId.toString().startsWith('tt') ? rawImdbId : `tt${rawImdbId}`

            const rawRating = item.imdb?.vote_average || item.tmdb?.vote_average
            if (rawRating) {
                meta.imdbRating = parseFloat(rawRating).toFixed(1)
            }

            // Fetch extra cast/director info from peoples API
            try {
                const peopleRes = await fetch(`https://ophim1.com/v1/api/phim/${slug}/peoples`)
                const peopleData: any = await peopleRes.json()
                if ((peopleData?.status === 'success' || peopleData?.success === true) && peopleData.data) {
                    const data = peopleData.data
                    const peoples = data.peoples || []

                    // Robust ID fallback from peoples API
                    if (!meta.imdb_id && data.imdb_id) {
                        meta.imdb_id = data.imdb_id.toString().startsWith('tt') ? data.imdb_id : `tt${data.imdb_id}`
                    }

                    // Fallback to simple strings (Limit to top contributors)
                    const directorsList = peoples.filter((p: any) => p.known_for_department === 'Directing' || p.known_for_department === 'Writing').map((p: any) => p.name).slice(0, 5)
                    const actorsList = peoples.filter((p: any) => p.known_for_department === 'Acting').map((p: any) => p.name).slice(0, 10)

                    if (directorsList.length > 0) meta.director = directorsList
                    if (actorsList.length > 0) meta.cast = actorsList

                    // Rich metadata for Stremio UI (matching Cinemeta structure)
                    const limitedActors = peoples.filter((p: any) => p.known_for_department === 'Acting').slice(0, 10)
                    const limitedCrew = peoples.filter((p: any) => p.known_for_department === 'Directing' || p.known_for_department === 'Writing').slice(0, 5)

                    meta.credits_cast = limitedActors.map((p: any) => ({
                        id: p.tmdb_people_id,
                        name: p.name,
                        character: p.character || '',
                        profile_path: p.profile_path ? (p.profile_path.startsWith('http') ? p.profile_path : `https://image.tmdb.org/t/p/w185${p.profile_path}`) : null
                    }))

                    meta.credits_crew = limitedCrew.map((p: any) => ({
                        id: p.tmdb_people_id,
                        name: p.name,
                        department: p.known_for_department,
                        job: p.known_for_department === 'Directing' ? 'Director' : 'Writer',
                        profile_path: p.profile_path ? (p.profile_path.startsWith('http') ? p.profile_path : `https://image.tmdb.org/t/p/w185${p.profile_path}`) : null
                    }))

                    // Links for navigation (properly categorized)
                    meta.links = [
                        ...(item.category?.map((cat: any) => ({
                            name: cat.name,
                            category: 'genre',
                            url: `stremio:///search?search=${encodeURIComponent(cat.name)}`
                        })) || []),
                        ...(limitedCrew.map((p: any) => ({
                            name: p.name,
                            category: 'director',
                            url: `stremio:///search?search=${encodeURIComponent(p.name)}`
                        }))),
                        ...(limitedActors.map((p: any) => ({
                            name: p.name,
                            category: 'actor',
                            url: `stremio:///search?search=${encodeURIComponent(p.name)}`
                        })))
                    ]
                }
            } catch (e) {
                console.error(`[Meta] Error fetching peoples for ${slug}:`, e)
            }

            // FINAL FALLBACK: Fetch from Cinemeta if runtime or rating is still missing
            if (meta.imdb_id && ((!meta.runtime || meta.runtime.includes('?') || meta.runtime === '0 Phút') || !meta.imdbRating)) {
                try {
                    console.log(`[Meta] Fetching fallback from Cinemeta for ${meta.imdb_id}`)
                    const cinemetaRes = await fetch(`https://cinemeta-live.strem.io/meta/${meta.type}/${meta.imdb_id}.json`)
                    const cinemetaData: any = await cinemetaRes.json()
                    if (cinemetaData?.meta) {
                        if ((!meta.runtime || meta.runtime.includes('?') || meta.runtime === '0 Phút') && cinemetaData.meta.runtime) {
                            meta.runtime = cinemetaData.meta.runtime
                        }
                        if (!meta.imdbRating && cinemetaData.meta.imdbRating) {
                            meta.imdbRating = cinemetaData.meta.imdbRating.toString()
                        }
                    }
                } catch (e) {
                    console.error(`[Meta] Cinemeta fallback failed:`, e)
                }
            }

            if (meta.type === 'series') {
                meta.videos = []
                item.episodes?.forEach((s: any) => s.server_data.forEach((ep: any) => {
                    const epNum = parseInt(ep.name) || (meta.videos.length + 1)
                    if (!meta.videos.find((v: any) => v.episode === epNum)) {
                        meta.videos.push({
                            id: `ophim:${item.slug}:1:${ep.slug}`,
                            title: `Tập ${ep.name} (${s.server_name})`,
                            season: 1,
                            episode: epNum,
                            released: new Date().toISOString()
                        })
                    }
                }))
                meta.videos.sort((a: any, b: any) => a.episode - b.episode)
            }
            return c.json({ meta })
        } catch (e) { return c.json({ meta: {} }) }
    }

    // Stream: /stream/:type/:id.json
    if (path.startsWith('/stream/')) {
        let parts = path.substring(8).split('/')
        if (parts.length < 2) return c.json({ streams: [] })

        const type = parts[0]
        let idRaw = parts[1] || ''
        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw

        console.log(`[Stream] Request: type=${type}, id=${id}`)

        let slug = ''
        let epSlug = '1'

        if (id.startsWith('ophim:')) {
            const idParts = id.split(':')
            slug = idParts[1]
            epSlug = idParts[3] || '1'
        } else if (id.startsWith('tt')) {
            const idParts = id.split(':')
            const imdbId = idParts[0]
            let season = 1

            if (type === 'series') {
                season = parseInt(idParts[1]) || 1
                epSlug = idParts[2] || '1'
            }

            const foundSlug = await getSlugFromImdb(imdbId, type, season)
            if (!foundSlug) {
                console.log(`[Stream] Could not map IMDB ${imdbId} S${season} to OPhim slug`)
                return c.json({ streams: [] })
            }

            slug = foundSlug
        } else {
            return c.json({ streams: [] })
        }

        try {
            console.log(`[Stream] Fetching OPhim streams: slug=${slug}, epSlug=${epSlug}`)
            const res = await fetch(`https://ophim1.com/v1/api/phim/${slug}`)
            const result: any = await res.json()
            const item = result.data.item
            if (!item || !item.episodes) return c.json({ streams: [] })

            const streams: any[] = []
            item.episodes.forEach((s: any) => {
                const serverData = s.server_data || []
                if (serverData.length === 0) return

                // Flexible matching for episode
                // 1. Exact match by name or slug
                // 2. Numeric match (e.g. "1" matches "Tập 1" or "01")
                // 3. For movies (type='movie' or only 1 ep), match "Full" or just take the first one
                let ep = serverData.find((e: any) =>
                    e.slug === epSlug ||
                    e.name === epSlug ||
                    e.name?.toLowerCase() === 'full' ||
                    e.name === `Tập ${epSlug}` ||
                    e.name === `Tập 0${epSlug}` ||
                    e.name === `0${epSlug}`
                )

                // If no match and it's a movie or there's only one episode, take the first one
                if (!ep && (type === 'movie' || serverData.length === 1)) {
                    ep = serverData[0]
                }

                if (ep?.link_m3u8) {
                    streams.push({
                        name: `OPhim\n${s.server_name}`,
                        title: `${item.name}\n${ep.name} [${item.quality || 'HD'}]`,
                        url: ep.link_m3u8
                    })
                }
            })
            return c.json({ streams })
        } catch (e) {
            console.error(`[Stream] Error fetching streams:`, e)
            return c.json({ streams: [] })
        }
    }

    return c.text('Not Found', 404)
})

export default app
