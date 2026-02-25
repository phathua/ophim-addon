import { GENRES, COUNTRIES, ensureMetadata } from './utils/metadata'

export async function getManifest() {
    await ensureMetadata()
    const EXTRA_CATALOG = [
        { name: 'genre', options: GENRES.map(g => g.name), isRequired: false },
        { name: 'country', options: COUNTRIES.map(c => c.name), isRequired: false }
    ]

    const EXTRA_SEARCH = [
        { name: 'search', isRequired: true }
    ]

    return {
        id: 'com.nghienphim.ophim.pro',
        name: 'OPhim Stremio Addon',
        version: '1.3.2',
        description: 'Addon xem phim từ OPhim với đầy đủ danh mục, thể loại và quốc gia cập nhật tự động.',
        resources: [
            { name: 'catalog', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
            { name: 'meta', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:'] },
            { name: 'stream', types: ['movie', 'series', 'anime', 'tv'], idPrefixes: ['ophim:', 'tt'] }
        ],
        types: ['movie', 'series', 'anime', 'tv'],
        catalogs: [
            { type: 'movie', id: 'ophim_search', name: 'OPhim - Tìm kiếm', extra: EXTRA_SEARCH },
            { type: 'series', id: 'ophim_search', name: 'OPhim - Tìm kiếm', extra: EXTRA_SEARCH },
            { type: 'movie', id: 'ophim_phim-moi', name: 'OPhim - Phim Mới', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_phim-bo', name: 'OPhim - Phim Bộ', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-le', name: 'OPhim - Phim Lẻ', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_tv-shows', name: 'OPhim - Shows', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_hoat-hinh', name: 'OPhim - Hoạt Hình', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-vietsub', name: 'OPhim - Vietsub', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-thuyet-minh', name: 'OPhim - Thuyết Minh', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-long-tien', name: 'OPhim - Lồng Tiếng', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_phim-bo-dang-chieu', name: 'OPhim - Bộ Đang Chiếu', extra: EXTRA_CATALOG },
            { type: 'series', id: 'ophim_phim-bo-hoan-thanh', name: 'OPhim - Bộ Hoàn Thành', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_subteam', name: 'OPhim - Subteam', extra: EXTRA_CATALOG },
            { type: 'movie', id: 'ophim_phim-chieu-rap', name: 'OPhim - Chiếu Rạp', extra: EXTRA_CATALOG }
        ],
        idPrefixes: ['ophim:', 'tt']
    }
}
