import { GENRES, COUNTRIES, ensureMetadata } from './utils/metadata'

const IMG_BASE = 'https://img.ophim1.com/uploads/movies/'

export async function handleCatalog(type: string, id: string, extra: string) {
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
        return { metas }
    } catch (e) {
        return { metas: [] }
    }
}
