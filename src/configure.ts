import { ALL_CATALOGS, DEFAULT_CATALOG_SLUGS } from './manifest';
import { GENRES, COUNTRIES, ensureMetadata, ADDON_LOGO } from './utils/metadata';

export async function getConfigureHtml(requestUrl: string): Promise<string> {
    await ensureMetadata();

    const url = new URL(requestUrl);
    const baseUrl = `${url.protocol}//${url.host}`;

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 25 }, (_, i) => currentYear - i);

    const clientData = {
        allCatalogs: ALL_CATALOGS,
        defaultCatalogs: DEFAULT_CATALOG_SLUGS,
        baseUrl: baseUrl,
        genres: GENRES,
        countries: COUNTRIES,
        years: years,
        addonLogo: ADDON_LOGO
    };

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cài đặt Addon OPhim</title>
    <link rel="icon" type="image/x-icon" href="https://ophim17.cc/assets/images/common/subteam_ophim.ico">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background-color: #0f172a;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }
        select {
            background-color: #1e293b;
            color: #f1f5f9;
            border: 1px solid #334155;
            transition: border-color 0.2s;
        }
        select:focus { 
            outline: none; 
            border-color: #10b981;
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">

    <div id="app" class="w-full max-w-5xl bg-slate-800 rounded-xl shadow-2xl p-6 md:p-8 border border-slate-700">
        <div class="text-center mb-8">
            <img src="\${clientData.addonLogo}" alt="OPhim Logo" class="h-24 w-24 mx-auto mb-4 rounded-xl shadow-lg border border-slate-700" />
            <h1 class="text-3xl font-bold text-white mb-2">Cài đặt OPhim Stremio</h1>
            <p class="text-slate-400">Tuỳ chỉnh danh mục và các bộ lọc chung để hiển thị trên trang chủ Stremio</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            
            <!-- Left column: Catalog selection & Global Filters -->
            <div class="flex flex-col gap-5 max-h-[700px]">
                
                <!-- Bộ lọc chung (Global Filters) -->
                <div class="bg-slate-900/50 rounded-lg p-5 border border-slate-700/50">
                    <h2 class="text-lg font-semibold mb-2 text-emerald-400 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                        </svg>
                        Bộ lọc mặc định (tuỳ chọn)
                    </h2>
                    <p class="text-xs text-slate-400 mb-4">
                        Áp dụng chung cho <strong>toàn bộ</strong> danh mục được chọn bên dưới hiển thị ở trang chủ. <br/>
                        <em>Lưu ý: Khi bấm "Khám Phá" (Show More) trong Board, Stremio sẽ bỏ qua bộ lọc này.</em>
                    </p>
                    
                    <div class="grid grid-cols-3 gap-3 text-sm">
                        <div class="flex flex-col">
                            <label class="text-slate-300 mb-1">Năm</label>
                            <select id="global-year" class="p-2 rounded w-full cursor-pointer">
                                <!-- JS Injection -->
                            </select>
                        </div>
                        <div class="flex flex-col">
                            <label class="text-slate-300 mb-1">Thể loại</label>
                            <select id="global-genre" class="p-2 rounded w-full cursor-pointer">
                                <!-- JS Injection -->
                            </select>
                        </div>
                        <div class="flex flex-col">
                            <label class="text-slate-300 mb-1">Quốc gia</label>
                            <select id="global-country" class="p-2 rounded w-full cursor-pointer">
                                <!-- JS Injection -->
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Chọn danh mục -->
                <div class="bg-slate-900/50 rounded-lg p-5 border border-slate-700/50 flex flex-col flex-grow min-h-0">
                    <h2 class="text-lg font-semibold mb-2 text-emerald-400 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                        </svg>
                        Danh mục hiển thị
                    </h2>
                    
                    <div id="catalog-list" class="space-y-3 overflow-y-auto pr-2 mt-2 flex-grow">
                        <!-- Catalogs will be injected here via JS -->
                    </div>
                    
                    <div class="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center text-sm text-slate-400">
                        <span id="selected-count">Đã chọn: 0</span>
                        <div class="space-x-3">
                            <button id="btn-reset" class="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">Reset</button>
                            <button id="btn-select-all" class="text-slate-300 hover:text-white transition-colors font-medium">Chọn tất cả</button>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Right column: Action -->
            <div class="flex flex-col justify-start lg:justify-center mt-4 md:mt-0">
                <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-700/50 text-center sticky top-6">
                    <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                    </div>
                    <h3 class="text-xl font-semibold mb-2 text-white">Sẵn sàng Cài Đặt</h3>
                    <p class="text-slate-400 text-sm mb-6">
                        Addon của bạn đã được cấu hình. Nhấn nút bên dưới để cài trực tiếp vào ứng dụng Stremio.
                    </p>

                    <a id="btn-install" href="#" class="inline-block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 text-xl flex justify-center items-center gap-2">
                        Cài Đặt Addon
                    </a>
                    
                    <button id="btn-copy" class="mt-4 w-full flex items-center justify-center space-x-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 text-sm text-slate-300 transition-colors font-medium active:scale-95">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 00-2 2v-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        <span id="txt-copy">Sao chép Liên kết HTTPS</span>
                    </button>
                    
                    <p class="mt-5 text-xs text-slate-500 text-left bg-slate-800/50 p-3 rounded border border-slate-700/50">
                        <strong>Mẹo thủ công:</strong> Nếu bạn đang cài trên TV/Box nhưng muốn dán link URL, hãy bấm nút sao chép ở trên rồi mở điện thoại dán link vào mục Search Addon trong app Stremio điện thoại.
                    </p>
                </div>
            </div>

        </div>
    </div>

    <script>
        const DATA = ${JSON.stringify(clientData)};
        
        // Trạng thái chung
        let selectedCatalogs = new Set(DATA.defaultCatalogs);
        let globalState = {
            y: "", // year
            g: "", // genre
            c: ""  // country
        };

        const listContainer = document.getElementById('catalog-list');
        const countDisplay = document.getElementById('selected-count');
        const btnInstall = document.getElementById('btn-install');
        const btnCopy = document.getElementById('btn-copy');
        const txtCopy = document.getElementById('txt-copy');
        const btnReset = document.getElementById('btn-reset');
        const btnSelectAll = document.getElementById('btn-select-all');

        const elYear = document.getElementById('global-year');
        const elGenre = document.getElementById('global-genre');
        const elCountry = document.getElementById('global-country');

        function generateSelectOptions(items, defaultText) {
            let html = \`<option value="">\${defaultText}</option>\`;
            items.forEach(item => {
                const isObj = typeof item === 'object';
                const v = isObj ? item.slug : item;
                const n = isObj ? item.name : item;
                html += \`<option value="\${v}">\${n}</option>\`;
            });
            return html;
        }

        // Đổ dữ liệu dropdown chung (chỉ làm 1 lần)
        elYear.innerHTML = generateSelectOptions(DATA.years, 'Tất cả năm');
        elGenre.innerHTML = generateSelectOptions(DATA.genres, 'Tất cả thể loại');
        elCountry.innerHTML = generateSelectOptions(DATA.countries, 'Tất cả quốc gia');

        function syncGlobalState() {
            globalState.y = elYear.value;
            globalState.g = elGenre.value;
            globalState.c = elCountry.value;
            updateUI();
        }

        elYear.addEventListener('change', syncGlobalState);
        elGenre.addEventListener('change', syncGlobalState);
        elCountry.addEventListener('change', syncGlobalState);

        function renderCatalogs() {
            listContainer.innerHTML = '';
            
            DATA.allCatalogs.forEach(catalog => {
                const isChecked = selectedCatalogs.has(catalog.slug);
                
                const label = document.createElement('label');
                label.className = \`flex items-center space-x-3 cursor-pointer group p-3 rounded-lg transition-colors border \${isChecked ? 'border-slate-600 bg-slate-800 shadow-sm' : 'border-slate-800/50 hover:border-slate-700 bg-slate-800/30'}\`;
                
                const typeText = catalog.type === 'movie' ? 'Phim Lẻ' : 'Phim Bộ';
                const nameText = catalog.name.replace('OPhim - ', '');

                label.innerHTML = \`
                    <div class="relative flex items-center">
                        <input type="checkbox" class="catalog-checkbox peer sr-only" value="\${catalog.slug}" \${isChecked ? 'checked' : ''}>
                        <div class="w-6 h-6 border-2 border-slate-500 rounded bg-slate-900 transition-colors flex items-center justify-center \${isChecked ? 'bg-emerald-500 border-emerald-500' : ''}">
                            <svg class="w-4 h-4 text-white opacity-0 transition-opacity \${isChecked ? 'opacity-100' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                    </div>
                    <div class="flex flex-col">
                        <span class="\${isChecked ? 'text-white' : 'text-slate-300'} font-medium transition-colors text-base">\${nameText} \${catalog.id === 'ophim_search' ? '(Bắt buộc)' : ''}</span>
                        <span class="text-xs text-slate-500 uppercase tracking-wider">\${typeText}</span>
                    </div>
                \`;

                const checkbox = label.querySelector('input.catalog-checkbox');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) selectedCatalogs.add(catalog.slug);
                    else selectedCatalogs.delete(catalog.slug);
                    
                    renderCatalogs(); // Rerender de update giao dien borders
                    updateUI();
                });

                listContainer.appendChild(label);
            });
        }

        function getManifestUrl() {
            let manifestUrl = DATA.baseUrl;
            const selCats = Array.from(selectedCatalogs);
            
            let configObj = { cats: selCats };
            let hasConfig = selCats.length > 0;

            if (globalState.y) { configObj.y = globalState.y; hasConfig = true; }
            if (globalState.g) { configObj.g = globalState.g; hasConfig = true; }
            if (globalState.c) { configObj.c = globalState.c; hasConfig = true; }

            // So sánh xem có khớp với thiết lập mặc định nguyên gốc không để hạn chế chèn biến thể
            const isCatsDefault = selCats.length === DATA.defaultCatalogs.length && selCats.every(s => DATA.defaultCatalogs.includes(s));
            const hasNoGlobalFilters = !globalState.y && !globalState.g && !globalState.c;

            if (isCatsDefault && hasNoGlobalFilters) {
                manifestUrl += '/manifest.json';
            } else {
                const b64 = btoa(JSON.stringify(configObj));
                manifestUrl += '/cf_' + b64 + '/manifest.json';
            }
            
            return manifestUrl;
        }

        function updateUI() {
            countDisplay.innerText = \`Đã chọn: \${selectedCatalogs.size}\`;
            const httpUrl = getManifestUrl();
            const stremioUrl = httpUrl.replace(/^https?:/, 'stremio:');
            btnInstall.href = stremioUrl;
        }

        // Initialize Events
        btnReset.addEventListener('click', () => {
            selectedCatalogs = new Set(DATA.defaultCatalogs);
            elYear.value = "";
            elGenre.value = "";
            elCountry.value = "";
            syncGlobalState();
            renderCatalogs();
            updateUI();
        });

        btnSelectAll.addEventListener('click', () => {
            selectedCatalogs = new Set(DATA.allCatalogs.map(c => c.slug));
            renderCatalogs();
            updateUI();
        });

        btnCopy.addEventListener('click', () => {
             const httpUrl = getManifestUrl();
             navigator.clipboard.writeText(httpUrl).then(() => {
                 txtCopy.innerText = "Đã sao chép!";
                 btnCopy.classList.replace('text-slate-300', 'text-emerald-400');
                 setTimeout(() => {
                     txtCopy.innerText = "Sao chép Liên kết HTTPS";
                     btnCopy.classList.replace('text-emerald-400', 'text-slate-300');
                 }, 2000);
             });
        });

        // First render
        renderCatalogs();
        updateUI();

    </script>
</body>
</html>
    `;
}
