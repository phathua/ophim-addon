import { ALL_CATALOGS, DEFAULT_CATALOG_SLUGS } from './manifest';

export function getConfigureHtml(requestUrl: string): string {
    const url = new URL(requestUrl);
    // Determine the base URL for the addon (replace http/https with stremio for installation)
    const baseUrl = `${url.protocol}//${url.host}`;

    // Pass the server-side data to the client-side JavaScript
    const clientData = {
        allCatalogs: ALL_CATALOGS,
        defaultCatalogs: DEFAULT_CATALOG_SLUGS,
        baseUrl: baseUrl
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OPhim Addon - Configuration</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background-color: #0f172a; /* slate-900 */
            color: #f8fafc; /* slate-50 */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            -webkit-font-smoothing: antialiased;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #1e293b;
        }
        ::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #64748b;
        }

        /* Custom Checkbox styles */
        .catalog-checkbox:checked + div {
            background-color: #10b981; /* emerald-500 */
            border-color: #10b981;
        }
        .catalog-checkbox:checked + div svg {
            opacity: 1;
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">

    <div id="app" class="w-full max-w-4xl bg-slate-800 rounded-xl shadow-2xl p-6 md:p-10 border border-slate-700">
        <div class="text-center mb-10">
            <img src="https://i.imgur.com/B9B1vdb.png" alt="OPhim Logo" class="h-24 w-24 mx-auto mb-4 rounded-xl shadow-lg border border-slate-700" />
            <h1 class="text-3xl font-bold text-white mb-2">OPhim Addon Configuration</h1>
            <p class="text-slate-400">Select the catalogs you want to display in Stremio</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            
            <!-- Left column: Catalog selection -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-700/50 flex flex-col max-h-[600px]">
                <h2 class="text-xl font-semibold mb-2 text-emerald-400 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                    Include Catalogs
                </h2>
                <p class="text-sm text-slate-400 mb-4">Choose which lists to show on Discover page.</p>
                
                <div id="catalog-list" class="space-y-3 overflow-y-auto pr-2 flex-grow min-h-[50px]">
                    <!-- Catalogs will be injected here via JS -->
                </div>
                
                <div class="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center text-sm text-slate-400">
                    <span id="selected-count">Selected: 0</span>
                    <button id="btn-reset" class="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">Reset to Default</button>
                    <button id="btn-select-all" class="text-slate-400 hover:text-white transition-colors font-medium">Select All</button>
                </div>
            </div>

            <!-- Right column: Action -->
            <div class="flex flex-col justify-center space-y-6">
                <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-700/50 text-center sticky top-6">
                    <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                    </div>
                    <h3 class="text-xl font-semibold mb-2 text-white">Ready to Install</h3>
                    <p class="text-slate-400 text-sm mb-6">
                        Your Addon is configured. Click the button below to install it into Stremio app.
                    </p>

                    <a id="btn-install" href="#" class="inline-block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 text-xl flex justify-center items-center gap-2">
                        Install Addon
                    </a>
                    
                    <button id="btn-copy" class="mt-4 w-full flex items-center justify-center space-x-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 text-sm text-slate-300 transition-colors font-medium active:scale-95">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        <span id="txt-copy">Copy HTTPS Link</span>
                    </button>
                    
                    <p class="mt-4 text-xs text-slate-500 text-left">
                        <strong>Tip:</strong> If you are on TV, you might need to use your phone/PC to copy the HTTPS link and paste it into Stremio's Addon search bar.
                    </p>
                </div>
            </div>

        </div>
    </div>

    <script>
        const DATA = ${JSON.stringify(clientData)};
        
        let selectedCatalogs = new Set(DATA.defaultCatalogs);

        const listContainer = document.getElementById('catalog-list');
        const countDisplay = document.getElementById('selected-count');
        const btnInstall = document.getElementById('btn-install');
        const btnCopy = document.getElementById('btn-copy');
        const txtCopy = document.getElementById('txt-copy');
        const btnReset = document.getElementById('btn-reset');
        const btnSelectAll = document.getElementById('btn-select-all');

        function renderCatalogs() {
            listContainer.innerHTML = '';
            
            DATA.allCatalogs.forEach(catalog => {
                const isSelected = selectedCatalogs.has(catalog.slug);
                
                const label = document.createElement('label');
                label.className = "flex items-center space-x-3 cursor-pointer group p-3 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700";
                
                const typeText = catalog.type === 'movie' ? 'Movies' : 'Series';
                const nameText = catalog.name.replace('OPhim - ', '');

                label.innerHTML = \`
                    <div class="relative flex items-center">
                        <input type="checkbox" class="catalog-checkbox peer sr-only" value="\${catalog.slug}" \${isSelected ? 'checked' : ''}>
                        <div class="w-6 h-6 border-2 border-slate-500 rounded bg-slate-800 transition-colors flex items-center justify-center">
                            <svg class="w-4 h-4 text-white opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-slate-200 font-medium group-hover:text-white transition-colors text-lg">\${nameText}</span>
                        <span class="text-xs text-slate-500 uppercase tracking-wider">\${typeText}</span>
                    </div>
                \`;

                const checkbox = label.querySelector('input');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedCatalogs.add(catalog.slug);
                    } else {
                        selectedCatalogs.delete(catalog.slug);
                    }
                    updateUI();
                });

                listContainer.appendChild(label);
            });
        }

        function getManifestUrl() {
            let manifestUrl = DATA.baseUrl + '/manifest.json';
            const selectedArray = Array.from(selectedCatalogs);
            
            // Check if matches defaults
            const isDefault = selectedArray.length === DATA.defaultCatalogs.length && 
                              selectedArray.every(s => DATA.defaultCatalogs.includes(s));
                            
            if (!isDefault && selectedArray.length > 0) {
                manifestUrl += '?catalogs=' + selectedArray.join(',');
            } else if (selectedArray.length === 0) {
                manifestUrl += '?catalogs=none';
            }
            
            return manifestUrl;
        }

        function updateUI() {
            // Update counts
            countDisplay.innerText = \`Selected: \${selectedCatalogs.size}\`;
            
            // Update install link
            const httpUrl = getManifestUrl();
            const stremioUrl = httpUrl.replace(/^https?:/, 'stremio:');
            btnInstall.href = stremioUrl;
        }

        // Initialize Events
        btnReset.addEventListener('click', () => {
            selectedCatalogs = new Set(DATA.defaultCatalogs);
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
                 txtCopy.innerText = "Copied!";
                 btnCopy.classList.replace('text-slate-300', 'text-emerald-400');
                 setTimeout(() => {
                     txtCopy.innerText = "Copy HTTPS Link";
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
