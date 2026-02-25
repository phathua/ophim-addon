import { GENRES, COUNTRIES, ensureMetadata, ADDON_ID, ADDON_LOGO } from './utils/metadata'

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

export async function getManifest(catalogParam?: string) {
    await ensureMetadata()
    const EXTRA_CATALOG = [
        { name: 'genre', options: GENRES.map(g => g.name), isRequired: false },
        { name: 'country', options: COUNTRIES.map(c => c.name), isRequired: false },
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
    let selectedSlugs: string[]
    if (catalogParam && catalogParam.trim() !== '') {
        // Nếu truyền param catalogs, parse danh sách
        selectedSlugs = catalogParam.split(',').map(s => s.trim()).filter(Boolean)
    } else {
        // Mặc định chỉ Phim Bộ và Phim Lẻ
        selectedSlugs = DEFAULT_CATALOG_SLUGS
    }

    // Lọc catalogs theo slugs đã chọn, giữ nguyên thứ tự trong registry
    const filteredCatalogs = ALL_CATALOGS
        .filter(c => selectedSlugs.includes(c.slug))
        .map(c => ({ type: c.type, id: c.id, name: c.name, extra: EXTRA_CATALOG }))

    return {
        id: ADDON_ID,
        name: 'OPhim Stremio Addon',
        logo: ADDON_LOGO,
        version: '1.4.0',
        description: 'Addon xem phim từ OPhim với đầy đủ danh mục, thể loại và quốc gia cập nhật tự động.',
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
