export const ADDON_ID = 'com.nghienphim.ophim.pro'
export const ADDON_LOGO = 'https://i.ibb.co/PvLCMqzK/ophim-logo.png'

export let GENRES: { name: string, slug: string }[] = []
export let COUNTRIES: { name: string, slug: string }[] = []
let lastMetaUpdate = 0
const META_CACHE_TTL = 3600000 // 1 hour

export async function ensureMetadata() {
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
