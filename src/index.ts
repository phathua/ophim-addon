import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('*', cors())

const GENRES = [
    { name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Tình Cảm', slug: 'tinh-cam' },
    { name: 'Hài Hước', slug: 'hai-huoc' }, { name: 'Cổ Trang', slug: 'co-trang' },
    { name: 'Tâm Lý', slug: 'tam-ly' }, { name: 'Hình Sự', slug: 'hinh-su' },
    { name: 'Chiến Tranh', slug: 'chien-tranh' }, { name: 'Thể Thao', slug: 'the-thao' },
    { name: 'Võ Thuật', slug: 'vo-thuat' }, { name: 'Viễn Tưởng', slug: 'vien-tuong' },
    { name: 'Phiêu Lưu', slug: 'phieu-luu' }, { name: 'Khoa Học', slug: 'khoa-hoc' },
    { name: 'Kinh Dị', slug: 'kinh-di' }, { name: 'Âm Nhạc', slug: 'am-nhac' },
    { name: 'Thần Thoại', slug: 'than-thoai' }, { name: 'Tài Liệu', slug: 'tai-lieu' },
    { name: 'Gia Đình', slug: 'gia-dinh' }, { name: 'Chính kịch', slug: 'chinh-kich' },
    { name: 'Bí ẩn', slug: 'bi-an' }, { name: 'Học Đường', slug: 'hoc-duong' },
    { name: 'Kinh Điển', slug: 'kinh-dien' }, { name: 'Phim 18+', slug: 'phim-18' }
]

const COUNTRIES = [
    { name: 'Âu Mỹ', slug: 'au-my' }, { name: 'Hàn Quốc', slug: 'han-quoc' },
    { name: 'Trung Quốc', slug: 'trung-quoc' }, { name: 'Nhật Bản', slug: 'nhat-ban' },
    { name: 'Thái Lan', slug: 'thai-lan' }, { name: 'Hồng Kông', slug: 'hong-kong' },
    { name: 'Đài Loan', slug: 'dai-loan' }, { name: 'Việt Nam', slug: 'viet-nam' },
    { name: 'Ấn Độ', slug: 'an-do' }, { name: 'Pháp', slug: 'phap' },
    { name: 'Đức', slug: 'duc' }, { name: 'Anh', slug: 'anh' },
    { name: 'Canada', slug: 'canada' }, { name: 'Khác', slug: 'khac' }
]

const EXTRA = [
    { name: 'search', isRequired: false },
    { name: 'genre', options: GENRES.map(g => g.name), isRequired: false },
    { name: 'country', options: COUNTRIES.map(c => c.name), isRequired: false }
]

const MANIFEST: any = {
    id: 'com.vibe.ophim.pro',
    name: 'OPhim Stremio Addon',
    version: '1.2.9',
    description: 'Addon xem phim từ OPhim với đầy đủ danh mục, thể loại và quốc gia.',
    resources: [
        { name: 'catalog', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
        { name: 'meta', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
        { name: 'stream', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:', 'tt'] }
    ],
    types: ['movie', 'series', 'anime', 'tv'],
    catalogs: [
        { type: 'movie', id: 'ophim_phim-moi', name: 'OPhim - Phim Mới', extra: EXTRA },
        { type: 'series', id: 'ophim_phim-bo', name: 'OPhim - Phim Bộ', extra: EXTRA },
        { type: 'movie', id: 'ophim_phim-le', name: 'OPhim - Phim Lẻ', extra: EXTRA },
        { type: 'series', id: 'ophim_tv-shows', name: 'OPhim - Shows', extra: EXTRA },
        { type: 'movie', id: 'ophim_hoat-hinh', name: 'OPhim - Hoạt Hình', extra: EXTRA },
        { type: 'movie', id: 'ophim_phim-vietsub', name: 'OPhim - Vietsub', extra: EXTRA },
        { type: 'movie', id: 'ophim_phim-thuyet-minh', name: 'OPhim - Thuyết Minh', extra: EXTRA },
        { type: 'movie', id: 'ophim_phim-long-tien', name: 'OPhim - Lồng Tiếng', extra: EXTRA },
        { type: 'series', id: 'ophim_phim-bo-dang-chieu', name: 'OPhim - Bộ Đang Chiếu', extra: EXTRA },
        { type: 'series', id: 'ophim_phim-bo-hoan-thanh', name: 'OPhim - Bộ Hoàn Thành', extra: EXTRA },
        { type: 'movie', id: 'ophim_phim-sap-chieu', name: 'OPhim - Sắp Chiếu', extra: EXTRA },
        { type: 'movie', id: 'ophim_subteam', name: 'OPhim - Subteam', extra: EXTRA },
        { type: 'movie', id: 'ophim_phim-chieu-rap', name: 'OPhim - Chiếu Rạp', extra: EXTRA }
    ],
    idPrefixes: ['ophim:', 'tt']
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

app.get('/manifest.json', (c) => c.json(MANIFEST))

// The most robust wildcard route
app.get('/*', async (c) => {
    let path = decodeURIComponent(c.req.path)
    console.log(`[Request] Decoded Path: ${path}`)

    if (path === '/manifest.json') return c.json(MANIFEST)

    // Catalog: /catalog/:type/:id/:extra?.json
    if (path.startsWith('/catalog/')) {
        let parts = path.substring(9).split('/')
        const type = parts[0]
        let idRaw = parts[1] || ''
        let extraRaw = parts[2] || ''

        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw
        let extra = extraRaw.endsWith('.json') ? extraRaw.slice(0, -5) : extraRaw

        console.log(`[Catalog] Parsed: type=${type}, id=${id}, extra=${extra}`)

        let searchQuery = '', genreSlug = '', countrySlug = ''
        if (extra) {
            extra.split('&').forEach(p => {
                const [k, v] = p.split('=')
                if (k === 'search') searchQuery = v
                if (k === 'genre') genreSlug = GENRES.find(g => g.name === v)?.slug || ''
                if (k === 'country') countrySlug = COUNTRIES.find(c => c.name === v)?.slug || ''
            })
        }

        let apiUrl = 'https://ophim1.com/v1/api/danh-sach/phim-moi?page=1'
        if (searchQuery) {
            apiUrl = `https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchQuery)}&page=1`
        } else if (id) {
            apiUrl = `https://ophim1.com/v1/api/danh-sach/${id.replace('ophim_', '')}?page=1`
            if (genreSlug) apiUrl += `&category=${genreSlug}`
            if (countrySlug) apiUrl += `&country=${countrySlug}`
        }

        try {
            const res = await fetch(apiUrl)
            const result: any = await res.json()
            const metas = (result.data.items || []).map((item: any) => ({
                id: `ophim:${item.slug}`,
                type: (item.type === 'series' || item.episodes_count > 1) ? 'series' : 'movie',
                name: item.name,
                poster: item.thumb_url.startsWith('http') ? item.thumb_url.replace('img.ophim.cc', 'img.ophim1.com') : `${IMG_BASE}${item.thumb_url}`,
                description: `${item.origin_name} (${item.year})`
            }))
            return c.json({ metas })
        } catch (e) {
            return c.json({ metas: [] })
        }
    }

    // Meta: /meta/:type/:id.json
    if (path.startsWith('/meta/')) {
        let parts = path.substring(6).split('/') // index 0 is type, index 1 is id
        let idRaw = parts[1] || ''
        let id = idRaw.endsWith('.json') ? idRaw.slice(0, -5) : idRaw

        // Handle encoded colon or just parts
        const slug = id.includes(':') ? id.split(':')[1] : id
        console.log(`[Meta] Parsed Slug: ${slug}`)

        try {
            const res = await fetch(`https://ophim1.com/v1/api/phim/${slug}`)
            const result: any = await res.json()
            const item = result.data.item
            if (!item) return c.json({ meta: {} })

            const fix = (u: string) => !u ? '' : (u.startsWith('http') ? u.replace('img.ophim.cc', 'img.ophim1.com') : `${IMG_BASE}${u}`)

            const meta: any = {
                id: `ophim:${item.slug}`,
                type: (item.type === 'series' || item.type === 'hoat-hinh' || (item.episodes && item.episodes[0]?.server_data.length > 1)) ? 'series' : 'movie',
                name: item.name,
                poster: fix(item.thumb_url),
                background: fix(item.poster_url),
                description: item.content ? item.content.replace(/<[^>]*>?/gm, '') : '',
                releaseInfo: item.year?.toString(),
                genres: item.category?.map((cat: any) => cat.name) || [],
                director: item.director || [],
                cast: item.actor || []
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
