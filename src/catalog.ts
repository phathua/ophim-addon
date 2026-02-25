import { GENRES, COUNTRIES, ensureMetadata } from './utils/metadata'

const IMG_BASE = 'https://img.ophim1.com/uploads/movies/'

export async function handleCatalog(type: string, id: string, extra: string) {
    console.log(`[Catalog] Parsed: type=${type}, id=${id}, extra=${extra}`)

    await ensureMetadata()
    let searchQuery = '', genreSlug = '', countrySlug = '', skip = 0
    if (extra) {
        extra.split('&').forEach(p => {
            const [k, v] = p.split('=')
            if (k === 'search') searchQuery = v
            if (k === 'genre') genreSlug = GENRES.find(g => g.name === v)?.slug || ''
            if (k === 'country') countrySlug = COUNTRIES.find(c => c.name === v)?.slug || ''
            if (k === 'skip') skip = parseInt(v) || 0
        })
    }

    const page = Math.floor(skip / 24) + 1

    let apiUrl = ''
    if (searchQuery) {
        apiUrl = `https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchQuery)}&page=${page}`
    } else if (id && id !== 'ophim_search') {
        apiUrl = `https://ophim1.com/v1/api/danh-sach/${id.replace('ophim_', '')}?page=${page}`
        if (genreSlug) apiUrl += `&category=${genreSlug}`
        if (countrySlug) apiUrl += `&country=${countrySlug}`
    } else {
        apiUrl = `https://ophim1.com/v1/api/danh-sach/phim-moi?page=${page}`
    }

    try {
        // Fetch two pages to provide a larger buffer (>20 items per scroll as requested)
        const fetchPage = async (p: number) => {
            const url = apiUrl.replace(`page=${page}`, `page=${p}`)
            const res = await fetch(url)
            return await res.json()
        }

        const [result1, result2] = await Promise.all([
            fetchPage(page),
            (skip > 0) ? fetchPage(page + 1).catch(() => ({ data: { items: [] } })) : Promise.resolve({ data: { items: [] } })
        ]) as [any, any]

        const allItems = [...(result1.data?.items || []), ...(result2.data?.items || [])]

        const metas = allItems.map((item: any) => ({
            id: `ophim:${item.slug}`,
            type: (item.type === 'series' || item.episodes_count > 1) ? 'series' : 'movie',
            name: item.name,
            poster: item.thumb_url.startsWith('http') ? item.thumb_url.replace('img.ophim.cc', 'img.ophim1.com') : `${IMG_BASE}${item.thumb_url}`,
            description: `${item.origin_name} (${item.year})`,
            releaseInfo: item.year?.toString(),
            imdbRating: (item.imdb?.vote_average || item.tmdb?.vote_average)?.toString()
        }))
        return { metas }
    } catch (e) {
        return { metas: [] }
    }
}
