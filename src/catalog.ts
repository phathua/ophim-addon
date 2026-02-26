import { GENRES, COUNTRIES, ensureMetadata } from './utils/metadata'
import { ENABLE_IMAGE_PROXY } from './proxy'

const IMG_BASE = 'https://img.ophim1.com/uploads/movies/'

export async function handleCatalog(type: string, id: string, extra: string, origin: string, configData?: any) {
    console.log(`[Catalog] Parsed: type=${type}, id=${id}, extra=${extra}`)

    await ensureMetadata()
    let searchQuery = '', skip = 0

    // Cấu hình từ config (nếu không có bộ lọc từ người dùng)
    let userGenre = '', userCountry = '', userYear = ''
    let hasExtraFilters = false

    if (extra) {
        extra.split('&').forEach(p => {
            const [k, v] = p.split('=')
            if (k === 'genre') { hasExtraFilters = true; userGenre = GENRES.find(g => g.name === v)?.slug || '' }
            if (k === 'country') { hasExtraFilters = true; userCountry = COUNTRIES.find(c => c.name === v)?.slug || '' }
            if (k === 'year') { hasExtraFilters = true; userYear = v }
            if (k === 'search') { hasExtraFilters = true; searchQuery = v }
            if (k === 'skip') { skip = parseInt(v) || 0; } // scrollKHÔNG đè bộ lọc mặc định
        })
    }

    const catSlug = id.replace('ophim_', '')
    let finalGenre = userGenre;
    let finalCountry = userCountry;
    let finalYear = userYear;

    // Chỉ áp dụng Default config filters nếu người dùng ĐANG trên BOARD hoặc CHƯA CHỌN BỘ LỌC NÀO
    if (!hasExtraFilters && configData) {
        finalGenre = configData.g || finalGenre;
        finalCountry = configData.c || finalCountry;
        finalYear = configData.y || finalYear;
    }

    const page = Math.floor(skip / 24) + 1

    let apiUrl = ''
    if (searchQuery) {
        apiUrl = `https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchQuery)}&page=${page}`
    } else if (id && id !== 'ophim_search') {
        apiUrl = `https://ophim1.com/v1/api/danh-sach/${catSlug}?page=${page}&sort_field=year&sort_type=desc`
        if (finalGenre) apiUrl += `&category=${finalGenre}`
        if (finalCountry) apiUrl += `&country=${finalCountry}`
        if (finalYear) apiUrl += `&year=${finalYear}`
    } else {
        apiUrl = `https://ophim1.com/v1/api/danh-sach/phim-moi?page=${page}&sort_field=year&sort_type=desc`
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

        const metas = allItems.map((item: any) => {
            const description = item.content ?
                item.content.replace(/<[^>]*>?/gm, '') :
                `[${item.quality || 'FHD'} - ${item.lang || 'VietSub'}] ${item.episode_current ? `Tình trạng: ${item.episode_current}\n\n` : ''}Đạo diễn: ${item.director ? item.director.join(', ') : 'Đang cập nhật'}\nDiễn viên: ${item.actor ? item.actor.join(', ') : 'Đang cập nhật'}\n\n${item.origin_name} (${item.year})`;

            const thumb = item.thumb_url.startsWith('http') ? item.thumb_url.replace('img.ophim.cc', 'img.ophim1.com') : `${IMG_BASE}${item.thumb_url}`;
            const poster = ENABLE_IMAGE_PROXY ? `${origin}/p/i/${thumb.replace('https://img.ophim1.com/uploads/movies/', '')}` : thumb;

            return {
                id: `ophim:${item.slug}`,
                type: (item.type === 'series' || item.episodes_count > 1) ? 'series' : 'movie',
                name: item.name,
                poster: poster,
                description: description,
                releaseInfo: item.year?.toString(),
                imdbRating: (item.imdb?.vote_average || item.tmdb?.vote_average)?.toString(),
                genres: item.category?.map((c: any) => c.name) || [],
                director: item.director || [],
                cast: item.actor || [],
                runtime: item.time
            }
        })
        return { metas }
    } catch (e) {
        return { metas: [] }
    }
}
