import { mask } from './proxy'
import { getSlugFromImdb } from './utils/mapping'

export async function handleStream(type: string, id: string, origin: string) {
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
            return { streams: [] }
        }

        slug = foundSlug
    } else {
        return { streams: [] }
    }

    try {
        console.log(`[Stream] Fetching OPhim streams: slug=${slug}, epSlug=${epSlug}`)
        const res = await fetch(`https://ophim1.com/v1/api/phim/${slug}`)
        const result: any = await res.json()
        const item = result.data.item
        if (!item || !item.episodes) return { streams: [] }

        const streams: any[] = []
        item.episodes.forEach((s: any) => {
            const serverData = s.server_data || []
            if (serverData.length === 0) return

            // Flexible matching for episode
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
                    url: `${origin}/p/v/${mask(ep.link_m3u8)}/index.m3u8`
                })
            }
        })
        return { streams }
    } catch (e) {
        console.error(`[Stream] Error fetching streams:`, e)
        return { streams: [] }
    }
}
