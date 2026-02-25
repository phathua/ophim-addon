// Simple in-memory cache for IMDB to slug mapping
const imdbCache = new Map<string, string>()

export async function getSlugFromImdb(imdbId: string, type: string, season?: number): Promise<string | null> {
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
