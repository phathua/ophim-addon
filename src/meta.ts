const IMG_BASE = 'https://img.ophim1.com/uploads/movies/'

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
}

const fixUrl = (u: string) => !u ? '' : (u.startsWith('http') ? u.replace('img.ophim.cc', 'img.ophim1.com') : `${IMG_BASE}${u}`)

export async function handleMeta(type: string, id: string) {
    const slug = id.includes(':') ? id.split(':')[1] : id
    console.log(`[Meta] Using Slug: ${slug}`)

    try {
        const res = await fetch(`https://ophim1.com/v1/api/phim/${slug}`)
        const result: any = await res.json()
        const item = result.data.item
        if (!item) return { meta: {} }

        const meta: any = {
            id: `ophim:${item.slug}`,
            type: (item.type === 'series' || item.type === 'hoat-hinh' || (item.episodes && item.episodes[0]?.server_data.length > 1)) ? 'series' : 'movie',
            name: item.name,
            poster: fixUrl(item.thumb_url),
            background: fixUrl(item.poster_url),
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
            imdb_id: undefined,
            logo: 'https://i.ibb.co/7dwr0j1f/loading.png'
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

        // Update logo if imdb_id is found
        if (meta.imdb_id) {
            meta.logo = `https://images.metahub.space/logo/medium/${meta.imdb_id}/img`
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
                    if (cinemetaData.meta.logo) {
                        meta.logo = cinemetaData.meta.logo
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
        return { meta }
    } catch (e) { return { meta: {} } }
}
