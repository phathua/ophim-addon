import { GENRES, COUNTRIES, ensureMetadata, ADDON_ID, ADDON_LOGO } from './utils/metadata'
import pkg from '../package.json'

// Registry tất cả catalogs có sẵn (không bao gồm search)
const ALL_CATALOGS: Array<{ type: string; id: string; name: string; slug: string }> = [
    { type: 'movie', id: 'ophim_phim-moi', name: 'OPhim - Phim Mới', slug: 'phim-moi' },
    { type: 'series', id: 'ophim_phim-bo', name: 'OPhim - Phim Bộ', slug: 'phim-bo' },
    { type: 'movie', id: 'ophim_phim-le', name: 'OPhim - Phim Lẻ', slug: 'phim-le' },
    { type: 'series', id: 'ophim_tv-shows', name: 'OPhim - Shows', slug: 'tv-shows' },
    { type: 'movie', id: 'ophim_hoat-hinh', name: 'OPhim - Hoạt Hình', slug: 'hoat-hinh' },
    { type: 'movie', id: 'ophim_phim-vietsub', name: 'OPhim - Vietsub', slug: 'phim-vietsub' },
    { type: 'movie', id: 'ophim_phim-thuyet-minh', name: 'OPhim - Thuyết Minh', slug: 'phim-thuyet-minh' },
    { type: 'movie', id: 'ophim_phim-long-tien', name: 'OPhim - Lồng Tiếng', slug: 'phim-long-tien' },
    { type: 'series', id: 'ophim_phim-bo-dang-chieu', name: 'OPhim - Bộ Đang Chiếu', slug: 'phim-bo-dang-chieu' },
    { type: 'series', id: 'ophim_phim-bo-hoan-thanh', name: 'OPhim - Bộ Hoàn Thành', slug: 'phim-bo-hoan-thanh' },
    { type: 'movie', id: 'ophim_subteam', name: 'OPhim - Subteam', slug: 'subteam' },
    { type: 'movie', id: 'ophim_phim-chieu-rap', name: 'OPhim - Chiếu Rạp', slug: 'phim-chieu-rap' },
]

// Catalogs mặc định khi không truyền params
const DEFAULT_CATALOG_SLUGS = ['phim-bo', 'phim-le']

export async function getManifest(configData?: any, catalogParam?: string) {
    await ensureMetadata()

    const currentYear = new Date().getFullYear();
    const yearsStrArr = Array.from({ length: 25 }, (_, i) => (currentYear - i).toString());

    const EXTRA_CATALOG = [
        { name: 'genre', options: GENRES.map(g => g.name), isRequired: false },
        { name: 'country', options: COUNTRIES.map(c => c.name), isRequired: false },
        { name: 'year', options: yearsStrArr, isRequired: false },
        { name: 'skip', isRequired: false }
    ]

    const EXTRA_SEARCH = [
        { name: 'search', isRequired: true },
        { name: 'skip', isRequired: false }
    ]

    // Luôn luôn có search catalogs
    const searchCatalogs = [
        { type: 'movie', id: 'ophim_search', name: 'OPhim - Tìm kiếm', extra: EXTRA_SEARCH },
        { type: 'series', id: 'ophim_search', name: 'OPhim - Tìm kiếm', extra: EXTRA_SEARCH },
    ]

    // Xác định danh sách catalog slugs cần hiển thị
    let selectedSlugs: string[] = []

    if (configData && configData.cats) {
        // Nếu load từ cấu hình UI config base64 URL
        selectedSlugs = configData.cats
    } else if (catalogParam && catalogParam.trim() !== '') {
        // Nếu truyền param catalogs (fallback url cũ)
        selectedSlugs = catalogParam.split(',').map(s => s.trim()).filter(Boolean)
    } else {
        // Mặc định chỉ Phim Bộ và Phim Lẻ
        selectedSlugs = DEFAULT_CATALOG_SLUGS
    }

    // Chuyển đổi ID config thành Tên dễ đọc
    let filterTags: string[] = []
    if (configData) {
        if (configData.y) filterTags.push(configData.y)
        if (configData.c) {
            filterTags.push(COUNTRIES.find(c => c.slug === configData.c)?.name || configData.c)
        }
        if (configData.g) {
            filterTags.push(GENRES.find(g => g.slug === configData.g)?.name || configData.g)
        }
    }
    const filterSuffix = filterTags.length > 0 ? ` (${filterTags.join(', ')})` : ''

    // Lọc catalogs theo slugs đã chọn, giữ nguyên thứ tự trong registry
    const filteredCatalogs = ALL_CATALOGS
        .filter(c => selectedSlugs.includes(c.slug))
        .map(c => ({
            type: c.type,
            id: c.id,
            name: `${c.name}${filterSuffix}`,
            extra: EXTRA_CATALOG
        }))

    let customDescription = 'Addon xem phim từ OPhim với đầy đủ danh mục, thể loại và quốc gia cập nhật tự động.'
    if (configData) {
        const catNames = ALL_CATALOGS.filter(c => selectedSlugs.includes(c.slug)).map(c => c.name.replace('OPhim - ', '')).join(', ')
        let extraFilters = []

        if (configData.y) extraFilters.push(`Năm: ${configData.y}`)
        if (configData.g) {
            const gName = GENRES.find(g => g.slug === configData.g)?.name || configData.g
            extraFilters.push(`Thể loại: ${gName}`)
        }
        if (configData.c) {
            const cName = COUNTRIES.find(c => c.slug === configData.c)?.name || configData.c
            extraFilters.push(`Quốc gia: ${cName}`)
        }

        customDescription = `Cấu hình tuỳ chỉnh của bạn:\n• Danh mục: ${catNames}`
        if (extraFilters.length > 0) {
            customDescription += `\n• Lọc mặc định: ${extraFilters.join(' | ')}`
        }
    }

    return {
        id: ADDON_ID,
        name: 'OPhim Stremio Addon',
        logo: ADDON_LOGO,
        version: pkg.version,
        description: customDescription,
        resources: [
            { name: 'catalog', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
            { name: 'meta', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
            { name: 'stream', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:', 'tt'] }
        ],
        types: ['movie', 'series', 'anime', 'tv'],
        catalogs: [...searchCatalogs, ...filteredCatalogs],
        idPrefixes: ['ophim:', 'tt']
    }
}

// Export registry để có thể sử dụng ở nơi khác
export { ALL_CATALOGS, DEFAULT_CATALOG_SLUGS }
