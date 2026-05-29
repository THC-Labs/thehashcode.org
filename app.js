// THC Labs Hub - Dynamic Supabase & Real Discord Sync Engine

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        apps: [],
        events: [],
        chatMessages: [],
        chatProfile: {
            username: 'GamerTHC',
            color: '#70e000'
        },
        pixelColors: [
            '#38b000', '#70e000', '#007200', '#1b4314', // Greens
            '#8b5a2b', '#3d2511', '#b07d4f', '#d4a373', // Browns/Gold
            '#ef4444', '#3b82f6', '#ffffff', '#000000'  // System colors
        ],
        selectedPixelColor: '#70e000',
        activeTool: 'draw', 
        showPixelGrid: true,
        canvasPixels: [], // 32x32 color grid (1024 strings)
        discordGuildId: '',
        isDiscordReal: false,
        isSupabaseReal: false
    };

    // --- SUPABASE CLIENT INITIALIZATION ---
    let supabase = null;
    const dbStatusLabel = document.getElementById('db-status');
    const dbStatusDot = document.querySelector('.status-dot');

    if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.key) {
        try {
            supabase = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
            state.isSupabaseReal = true;
            dbStatusLabel.textContent = 'SUPABASE CLOUD';
            dbStatusDot.classList.add('online');
            console.log('Successfully connected to Supabase Database client.');
        } catch (err) {
            console.error('Failed to initialize Supabase client:', err);
            fallbackToLocalDatabase();
        }
    } else {
        fallbackToLocalDatabase();
    }

    function fallbackToLocalDatabase() {
        state.isSupabaseReal = false;
        dbStatusLabel.textContent = 'LOCAL SANDBOX';
        if (dbStatusDot) {
            dbStatusDot.style.backgroundColor = '#fbbf24';
            dbStatusDot.style.boxShadow = '0 0 8px #fbbf24';
        }
        console.warn('Supabase URL/Key not found in window.SUPABASE_CONFIG. Falling back to browser LocalStorage.');
    }

    // --- DOM ELEMENTS ---
    const digitalClock = document.getElementById('digital-clock');
    const appsContainer = document.getElementById('apps-container');
    const discordUsers = document.getElementById('discord-users');
    const vcUsersList = document.getElementById('vc-users-list');
    const onlineCounter = document.getElementById('online-counter');
    const vcChannelName = document.getElementById('vc-channel-name');
    const vcChannelPanel = document.getElementById('vc-channel-panel');
    const discordHeaderLink = document.getElementById('discord-header-link');
    
    // Pixel Canvas Elements (Full board)
    const pixelCanvas = document.getElementById('pixel-canvas');
    const ctx = pixelCanvas.getContext('2d');
    
    // Pixel Canvas Elements (Dashboard Preview board)
    const pixelCanvasPreview = document.getElementById('pixel-canvas-preview');
    const ctxPreview = pixelCanvasPreview.getContext('2d');

    const pixelColorsPalette = document.getElementById('pixel-colors');
    const customColorInput = document.getElementById('custom-color');
    const toolDrawBtn = document.getElementById('tool-draw');
    const toolEraseBtn = document.getElementById('tool-erase');
    const toolGridToggleBtn = document.getElementById('tool-grid-toggle');
    const btnClearCanvas = document.getElementById('btn-clear-canvas');
    const btnDownloadCanvas = document.getElementById('btn-download-canvas');
    const liveDbSyncStatus = document.getElementById('live-db-sync-status');

    // Chat Elements
    const chatMessagesContainer = document.getElementById('chat-messages-container');
    const chatInput = document.getElementById('chat-input');
    const btnSendMessage = document.getElementById('btn-send-message');
    const chatSettingsToggle = document.getElementById('chat-settings-toggle');
    const chatConfigBar = document.getElementById('chat-config-bar');
    const chatUsernameInput = document.getElementById('chat-username');
    const chatColorSelector = document.getElementById('chat-color-selector');
    const btnSaveChatProfile = document.getElementById('btn-save-chat-profile');

    // Events Elements
    const eventsContainer = document.getElementById('events-container');
    const btnAddEvent = document.getElementById('btn-add-event');
    const modalEvent = document.getElementById('modal-event');
    const modalEventClose = document.getElementById('modal-event-close');
    const btnCancelEvent = document.getElementById('btn-cancel-event');
    const btnSaveEvent = document.getElementById('btn-save-event');

    // App Modals Elements
    const btnAddApp = document.getElementById('btn-add-app');
    const modalApp = document.getElementById('modal-app');
    const modalAppClose = document.getElementById('modal-app-close');
    const btnCancelApp = document.getElementById('btn-cancel-app');
    const btnSaveApp = document.getElementById('btn-save-app');

    // Discord Settings Elements
    const discordSettingsBtn = document.getElementById('discord-settings-btn');
    const modalDiscord = document.getElementById('modal-discord');
    const modalDiscordClose = document.getElementById('modal-discord-close');
    const btnCancelDiscord = document.getElementById('btn-cancel-discord');
    const btnSaveDiscord = document.getElementById('btn-save-discord');
    const discordGuildIdInput = document.getElementById('discord-guild-id');

    // Tab Navigation Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabViews = document.querySelectorAll('.tab-view');
    const btnGoToPixelTab = document.getElementById('btn-go-to-pixel-tab');
    const btnBackToDashboard = document.getElementById('btn-back-to-dashboard');

    // --- INITIALIZATION ---
    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        loadDiscordConfiguration();
        loadLocalAppSubdomains();
        renderApps();
        renderChatProfileSelector();

        // Initial Data Fetch
        fetchChatMessages();
        fetchGamingEvents();
        fetchPixelBoard();
        fetchRealDiscordWidget();

        // Setup drawing palettes
        initPixelCanvas();
        setupEventListeners();

        // Start Sync / Polling Loops (CORS discord & Supabase)
        setInterval(fetchChatMessages, 4000);   // Chat polls every 4s
        setInterval(fetchPixelBoard, 5000);     // Pixel Canvas polls every 5s
        setInterval(fetchGamingEvents, 8000);   // Events poll every 8s
        setInterval(fetchRealDiscordWidget, 15000); // Discord widget polls every 15s
    }

    // --- DIGITAL CLOCK ---
    function updateClock() {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        digitalClock.textContent = timeStr;
    }

    // --- TAB SWITCHER ---
    function switchTab(targetTabId) {
        tabButtons.forEach(btn => {
            const isActive = btn.getAttribute('data-tab') === targetTabId;
            btn.classList.toggle('active', isActive);
        });

        tabViews.forEach(view => {
            const isTarget = view.id === targetTabId;
            view.classList.toggle('hidden', !isTarget);
            view.classList.toggle('active', isTarget);
        });

        // Trigger canvas redraw when entering drawing tab
        if (targetTabId === 'pixel-art-view') {
            setTimeout(drawPixelBoard, 50);
        }
    }

    // --- LOCAL STORAGE WIDGET CONFIGS ---
    function loadDiscordConfiguration() {
        // Load Discord Guild ID
        const storedGuildId = localStorage.getItem('thc_discord_guild_id');
        if (storedGuildId) {
            state.discordGuildId = storedGuildId;
        } else if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.discordGuildId) {
            state.discordGuildId = window.SUPABASE_CONFIG.discordGuildId;
        }
        discordGuildIdInput.value = state.discordGuildId;
    }

    function loadLocalAppSubdomains() {
        const storedApps = localStorage.getItem('thc_apps');
        if (storedApps) {
            state.apps = JSON.parse(storedApps);
        } else {
            // Default real apps
            state.apps = [
                { id: 1, name: 'THC Games Hub', url: 'https://games.thehashcode.org', desc: 'Zona de ocio y videojuegos retro del grupo.', icon: 'fa-gamepad', color: 'green' },
                { id: 2, name: 'Despensia Portal', url: 'https://despensia.thehashcode.org', desc: 'Gestor compartido de despensa e inventario de cocina.', icon: 'fa-cart-shopping', color: 'brown' }
            ];
            localStorage.setItem('thc_apps', JSON.stringify(state.apps));
        }

        // Load profile settings
        const storedProfile = localStorage.getItem('thc_chat_profile');
        if (storedProfile) {
            state.chatProfile = JSON.parse(storedProfile);
        }
    }

    // --- APPS GRID CONTROLLER ---
    function renderApps() {
        appsContainer.innerHTML = '';
        state.apps.forEach(app => {
            const card = document.createElement('a');
            card.href = app.url;
            card.target = '_blank';
            card.className = `app-card card-${app.color}`;
            
            // Allow deletion only for custom added apps
            const isDefault = app.url.includes('games.thehashcode.org') || app.url.includes('despensia.thehashcode.org');
            const deleteBtnHtml = !isDefault ? `<button class="app-delete-btn" data-id="${app.id}"><i class="fa-solid fa-trash-can"></i></button>` : '';

            card.innerHTML = `
                ${deleteBtnHtml}
                <div class="app-icon-box">
                    <i class="fa-solid ${app.icon}"></i>
                </div>
                <div class="app-details">
                    <h4>${app.name}</h4>
                    <p>${app.desc}</p>
                </div>
                <span class="app-domain"><i class="fa-solid fa-link"></i> ${app.url.replace('https://', '').replace('http://', '')}</span>
            `;

            const deleteBtn = card.querySelector('.app-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteApp(app.id);
                });
            }

            appsContainer.appendChild(card);
        });
    }

    function deleteApp(id) {
        state.apps = state.apps.filter(app => app.id !== id);
        localStorage.setItem('thc_apps', JSON.stringify(state.apps));
        renderApps();
    }

    // --- DYNAMIC SUPABASE SYNC: EVENTS ---
    async function fetchGamingEvents() {
        if (state.isSupabaseReal) {
            try {
                const { data, error } = await supabase
                    .from('thc_gaming_events')
                    .select('*');
                if (error) throw error;
                state.events = data || [];
                renderEvents();
            } catch (err) {
                console.error('Supabase fetch gaming_events failed:', err);
            }
        } else {
            // Local fallback
            const localEvents = localStorage.getItem('thc_events');
            state.events = localEvents ? JSON.parse(localEvents) : [];
            renderEvents();
        }
    }

    function renderEvents() {
        eventsContainer.innerHTML = '';
        if (state.events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="event-card" style="border-left-color: var(--text-muted); text-align: center; padding: 1.2rem;">
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">No hay quedadas programadas.</p>
                </div>`;
            return;
        }

        // Sort events chronologically
        const sorted = [...state.events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

        sorted.forEach(ev => {
            const dateObj = new Date(ev.event_date);
            const formatted = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <button class="event-delete-btn" data-id="${ev.id}"><i class="fa-solid fa-trash-can"></i></button>
                <div class="event-card-header">
                    <h4>${ev.title}</h4>
                    <span class="event-date-badge"><i class="fa-regular fa-clock"></i> ${formatted}</span>
                </div>
                <p class="event-meta">${ev.description || ''}</p>
                <span class="event-platform-tag"><i class="fa-solid fa-location-dot"></i> ${ev.platform}</span>
            `;

            card.querySelector('.event-delete-btn').addEventListener('click', () => {
                deleteEvent(ev.id);
            });

            eventsContainer.appendChild(card);
        });
    }

    async function deleteEvent(id) {
        if (state.isSupabaseReal) {
            try {
                const { error } = await supabase
                    .from('thc_gaming_events')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                fetchGamingEvents();
            } catch (err) {
                console.error('Supabase delete event error:', err);
            }
        } else {
            state.events = state.events.filter(e => e.id !== id);
            localStorage.setItem('thc_events', JSON.stringify(state.events));
            renderEvents();
        }
    }

    // --- DYNAMIC SUPABASE SYNC: CHAT ---
    async function fetchChatMessages() {
        if (state.isSupabaseReal) {
            try {
                const { data, error } = await supabase
                    .from('thc_chat_messages')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(40);
                if (error) throw error;
                
                // Supabase fetched messages are descending. Reverse them for chronological render
                const messages = (data || []).reverse().map(m => {
                    const d = new Date(m.created_at);
                    const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    return {
                        user: m.username,
                        color: m.color,
                        msg: m.message,
                        time: timeStr
                    };
                });

                // Render only if new messages are detected
                if (JSON.stringify(messages) !== JSON.stringify(state.chatMessages)) {
                    state.chatMessages = messages;
                    renderChat();
                }
            } catch (err) {
                console.error('Supabase fetch chat failed:', err);
            }
        } else {
            // Local fallback
            const localChat = localStorage.getItem('thc_chat_messages');
            state.chatMessages = localChat ? JSON.parse(localChat) : [];
            renderChat();
        }
    }

    function renderChat() {
        chatMessagesContainer.innerHTML = '';
        state.chatMessages.forEach(msg => {
            const card = document.createElement('div');
            const isSelf = msg.user === state.chatProfile.username;
            card.className = `chat-message ${isSelf ? 'self' : ''}`;
            card.innerHTML = `
                <div class="msg-header">
                    <span class="msg-username" style="color: ${msg.color}">${msg.user}</span>
                    <span class="msg-time">${msg.time}</span>
                </div>
                <div class="msg-body">${escapeHtml(msg.msg)}</div>
            `;
            chatMessagesContainer.appendChild(card);
        });
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function renderChatProfileSelector() {
        chatUsernameInput.value = state.chatProfile.username;
        chatColorSelector.innerHTML = '';
        
        const avatarColors = ['#70e000', '#38b000', '#d4a373', '#b07d4f', '#ffb703', '#3b82f6', '#ef4444', '#a855f7'];
        avatarColors.forEach(color => {
            const dot = document.createElement('span');
            dot.className = 'color-dot-choice';
            dot.style.backgroundColor = color;
            if (state.chatProfile.color === color) {
                dot.classList.add('selected');
            }
            dot.addEventListener('click', () => {
                document.querySelectorAll('.color-dot-choice').forEach(d => d.classList.remove('selected'));
                dot.classList.add('selected');
                state.chatProfile.color = color;
            });
            chatColorSelector.appendChild(dot);
        });
    }

    async function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        if (state.isSupabaseReal) {
            try {
                const { error } = await supabase
                    .from('thc_chat_messages')
                    .insert([{
                        username: state.chatProfile.username,
                        color: state.chatProfile.color,
                        message: text
                    }]);
                if (error) throw error;
                chatInput.value = '';
                fetchChatMessages();
            } catch (err) {
                console.error('Supabase write chat failed:', err);
            }
        } else {
            // Local fallback
            const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const newMsg = {
                user: state.chatProfile.username,
                color: state.chatProfile.color,
                msg: text,
                time: time
            };
            state.chatMessages.push(newMsg);
            if (state.chatMessages.length > 40) state.chatMessages.shift();
            localStorage.setItem('thc_chat_messages', JSON.stringify(state.chatMessages));
            renderChat();
            chatInput.value = '';
        }
    }

    // --- DYNAMIC SUPABASE SYNC: PIXEL BOARD ---
    const logicalGridSize = 32;
    let isDrawing = false;
    let saveTimeout = null;

    async function fetchPixelBoard() {
        if (state.isSupabaseReal) {
            try {
                const { data, error } = await supabase
                    .from('thc_pixel_board')
                    .select('*')
                    .eq('id', 1)
                    .single();
                
                if (error && error.code !== 'PGRST116') throw error; // ignore row-not-found errors

                if (data && Array.isArray(data.pixels) && data.pixels.length === 1024) {
                    if (JSON.stringify(data.pixels) !== JSON.stringify(state.canvasPixels)) {
                        state.canvasPixels = data.pixels;
                        drawPixelBoard();
                        drawPixelPreview();
                    }
                } else if (!data) {
                    // Create board if missing in cloud
                    const emptyGrid = new Array(32 * 32).fill('#000000');
                    await supabase.from('thc_pixel_board').insert({ id: 1, pixels: emptyGrid });
                    state.canvasPixels = emptyGrid;
                    drawPixelBoard();
                    drawPixelPreview();
                }
            } catch (err) {
                console.error('Supabase fetch pixel board failed:', err);
            }
        } else {
            // Local fallback
            const localCanvas = localStorage.getItem('thc_pixel_canvas');
            if (localCanvas) {
                const parsed = JSON.parse(localCanvas);
                if (JSON.stringify(parsed) !== JSON.stringify(state.canvasPixels)) {
                    state.canvasPixels = parsed;
                    drawPixelBoard();
                    drawPixelPreview();
                }
            } else {
                state.canvasPixels = new Array(32 * 32).fill('#000000');
                localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
                drawPixelBoard();
                drawPixelPreview();
            }
        }
    }

    function initPixelCanvas() {
        // Build palette
        pixelColorsPalette.innerHTML = '';
        state.pixelColors.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'color-option';
            colorDiv.style.backgroundColor = color;
            if (state.selectedPixelColor === color) {
                colorDiv.classList.add('selected');
            }
            colorDiv.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
                colorDiv.classList.add('selected');
                state.selectedPixelColor = color;
                state.activeTool = 'draw';
                updateToolButtons();
            });
            pixelColorsPalette.appendChild(colorDiv);
        });

        customColorInput.addEventListener('input', (e) => {
            state.selectedPixelColor = e.target.value;
            document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
            state.activeTool = 'draw';
            updateToolButtons();
        });

        drawPixelBoard();
        drawPixelPreview();
    }

    // Render large full-screen canvas
    function drawPixelBoard() {
        if (!pixelCanvas) return;
        const width = pixelCanvas.width;
        const height = pixelCanvas.height;
        const cellSize = width / logicalGridSize;

        // Fill background
        ctx.fillStyle = '#020402';
        ctx.fillRect(0, 0, width, height);

        // Draw individual pixels
        for (let y = 0; y < logicalGridSize; y++) {
            for (let x = 0; x < logicalGridSize; x++) {
                const color = state.canvasPixels[y * logicalGridSize + x];
                if (color && color !== '#000000') {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        // Draw grid boundaries
        if (state.showPixelGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= logicalGridSize; i++) {
                ctx.beginPath();
                ctx.moveTo(i * cellSize, 0);
                ctx.lineTo(i * cellSize, height);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(width, i * cellSize);
                ctx.stroke();
            }
        }
    }

    // Render cropped/masked preview canvas on dashboard
    function drawPixelPreview() {
        if (!pixelCanvasPreview) return;
        const width = pixelCanvasPreview.width;
        const height = pixelCanvasPreview.height;
        const cellSize = width / logicalGridSize; // 256 / 32 = 8px

        ctxPreview.fillStyle = '#020402';
        ctxPreview.fillRect(0, 0, width, height);

        for (let y = 0; y < logicalGridSize; y++) {
            for (let x = 0; x < logicalGridSize; x++) {
                const color = state.canvasPixels[y * logicalGridSize + x];
                if (color && color !== '#000000') {
                    ctxPreview.fillStyle = color;
                    ctxPreview.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    function paintPixelAtCoordinates(x, y) {
        const canvasRect = pixelCanvas.getBoundingClientRect();
        
        const scaleX = pixelCanvas.width / canvasRect.width;
        const scaleY = pixelCanvas.height / canvasRect.height;
        
        const canvasX = (x - canvasRect.left) * scaleX;
        const canvasY = (y - canvasRect.top) * scaleY;
        
        const cellX = Math.floor(canvasX / (pixelCanvas.width / logicalGridSize));
        const cellY = Math.floor(canvasY / (pixelCanvas.height / logicalGridSize));

        if (cellX >= 0 && cellX < logicalGridSize && cellY >= 0 && cellY < logicalGridSize) {
            const index = cellY * logicalGridSize + cellX;
            const drawColor = state.activeTool === 'draw' ? state.selectedPixelColor : '#000000';
            
            if (state.canvasPixels[index] !== drawColor) {
                state.canvasPixels[index] = drawColor;
                
                // Update local storage
                localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
                
                // Draw frames
                drawPixelBoard();
                drawPixelPreview();

                // Trigger Debounced save to Supabase
                triggerDebouncedSave();
            }
        }
    }

    function triggerDebouncedSave() {
        if (liveDbSyncStatus) {
            liveDbSyncStatus.textContent = 'Guardando...';
            liveDbSyncStatus.classList.add('text-green');
        }

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            if (state.isSupabaseReal) {
                try {
                    const { error } = await supabase
                        .from('thc_pixel_board')
                        .upsert({ id: 1, pixels: state.canvasPixels });
                    if (error) throw error;
                } catch (err) {
                    console.error('Supabase pixel board save failed:', err);
                }
            }
            if (liveDbSyncStatus) {
                liveDbSyncStatus.textContent = 'Sincronizado';
                liveDbSyncStatus.classList.remove('text-green');
            }
        }, 1200); // Wait for 1.2 seconds of inactivity before writing to db
    }

    function updateToolButtons() {
        toolDrawBtn.classList.toggle('active', state.activeTool === 'draw');
        toolEraseBtn.classList.toggle('active', state.activeTool === 'erase');
    }

    // --- REAL DISCORD WIDGET INTEGRATION (IFRAME EMBED) ---
    function fetchRealDiscordWidget() {
        if (!state.discordGuildId) {
            renderSimulatedDiscord();
            return;
        }

        state.isDiscordReal = true;
        
        // Render official Discord Iframe widget
        const widgetBody = document.querySelector('.discord-widget .panel-content');
        if (widgetBody) {
            widgetBody.classList.remove('scrollable'); // Scroll handles internally in iframe
            widgetBody.style.padding = '0';
            widgetBody.innerHTML = `
                <iframe src="https://discord.com/widget?id=${state.discordGuildId}&theme=dark" 
                        width="100%" 
                        height="360" 
                        allowtransparency="true" 
                        frameborder="0" 
                        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                        style="border: none; width: 100%; height: 360px; display: block; border-radius: 8px;">
                </iframe>
            `;
        }

        // Hide local Voice Chat channel overlay because the iframe widget displays it natively!
        if (vcChannelPanel) {
            vcChannelPanel.style.display = 'none';
        }

        onlineCounter.textContent = `En vivo`;
    }

    function renderSimulatedDiscord(showWarning = false) {
        state.isDiscordReal = false;
        
        const widgetBody = document.querySelector('.discord-widget .panel-content');
        if (widgetBody) {
            widgetBody.classList.add('scrollable');
            widgetBody.style.padding = '1rem';
            widgetBody.innerHTML = `<ul class="discord-user-list" id="discord-users"></ul>`;
        }
        
        const discordUsersList = document.getElementById('discord-users');
        if (!discordUsersList) return;

        // Render online count
        onlineCounter.textContent = `3 online`;

        // Render simulated members
        discordUsersList.innerHTML = '';
        
        if (showWarning) {
            const warnItem = document.createElement('li');
            warnItem.style.fontSize = '0.7rem';
            warnItem.style.color = 'var(--gold-primary)';
            warnItem.style.backgroundColor = 'rgba(212, 163, 115, 0.08)';
            warnItem.style.border = '1px solid rgba(212, 163, 115, 0.2)';
            warnItem.style.padding = '0.4rem';
            warnItem.style.borderRadius = '4px';
            warnItem.style.marginBottom = '0.6rem';
            warnItem.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ID Discord inválido o Widget inactivo. Ajusta la ID en la rueda dentada.`;
            discordUsersList.appendChild(warnItem);
        }

        const simulatedFriends = [
            { name: 'SlayerCode', status: 'online', game: 'Valorant', avatar: '#38b000' },
            { name: 'WeedWizard', status: 'idle', game: 'Minecraft', avatar: '#d4a373' },
            { name: 'HexGamer', status: 'online', game: 'Counter-Strike 2', avatar: '#b07d4f' }
        ];

        simulatedFriends.forEach(user => {
            const item = document.createElement('li');
            item.className = 'discord-user-card';
            
            let statusClass = 'online';
            if (user.status === 'idle') statusClass = 'idle';

            item.innerHTML = `
                <div class="avatar-wrapper">
                    <div class="user-avatar" style="background-color: ${user.avatar}; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; color: #111;">
                        ${user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span class="user-status-dot ${statusClass}"></span>
                </div>
                <div class="user-info">
                    <span class="user-name">${user.name}</span>
                    <span class="user-game">Jugando a <strong>${user.game}</strong></span>
                </div>
            `;
            discordUsersList.appendChild(item);
        });

        vcChannelPanel.style.display = 'block';
        vcChannelName.innerHTML = `Canal de Voz: <strong>General (Demo)</strong>`;
        
        vcUsersList.innerHTML = '';
        ['SlayerCode', 'HexGamer'].forEach(username => {
            const tag = document.createElement('div');
            tag.className = 'vc-user-tag';
            tag.innerHTML = `
                <i class="fa-solid fa-microphone"></i>
                <span style="font-weight: 500;">${username}</span>
            `;
            vcUsersList.appendChild(tag);
        });
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Tab navigations toggles
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                switchTab(targetTab);
            });
        });

        btnGoToPixelTab.addEventListener('click', () => {
            switchTab('pixel-art-view');
        });

        btnBackToDashboard.addEventListener('click', () => {
            switchTab('dashboard-view');
        });

        // App Modal triggers
        btnAddApp.addEventListener('click', () => modalApp.classList.remove('hidden'));
        modalAppClose.addEventListener('click', () => modalApp.classList.add('hidden'));
        btnCancelApp.addEventListener('click', () => modalApp.classList.add('hidden'));

        btnSaveApp.addEventListener('click', () => {
            const name = document.getElementById('app-name').value.trim();
            const url = document.getElementById('app-url').value.trim();
            const desc = document.getElementById('app-desc').value.trim();
            const icon = document.getElementById('app-icon').value;
            const color = document.querySelector('input[name="app-color"]:checked').value;

            if (!name || !url || !desc) {
                alert('Por favor, rellena todos los campos.');
                return;
            }

            const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
            const newApp = {
                id: Date.now(),
                name: name,
                url: formattedUrl,
                desc: desc,
                icon: icon,
                color: color
            };

            state.apps.push(newApp);
            localStorage.setItem('thc_apps', JSON.stringify(state.apps));
            renderApps();

            // Clear inputs
            document.getElementById('app-name').value = '';
            document.getElementById('app-url').value = '';
            document.getElementById('app-desc').value = '';
            modalApp.classList.add('hidden');
        });

        // Event Modal triggers
        btnAddEvent.addEventListener('click', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(21, 0, 0, 0);
            document.getElementById('event-date').value = tomorrow.toISOString().substring(0, 16);
            modalEvent.classList.remove('hidden');
        });
        modalEventClose.addEventListener('click', () => modalEvent.classList.add('hidden'));
        btnCancelEvent.addEventListener('click', () => modalEvent.classList.add('hidden'));

        btnSaveEvent.addEventListener('click', async () => {
            const title = document.getElementById('event-title').value.trim();
            const date = document.getElementById('event-date').value;
            const platform = document.getElementById('event-platform').value.trim();
            const desc = document.getElementById('event-desc').value.trim();

            if (!title || !date || !platform) {
                alert('Rellena los campos obligatorios.');
                return;
            }

            if (state.isSupabaseReal) {
                try {
                    const { error } = await supabase
                        .from('thc_gaming_events')
                        .insert([{
                            title: title,
                            event_date: date,
                            platform: platform,
                            description: desc
                        }]);
                    if (error) throw error;
                    fetchGamingEvents();
                } catch (err) {
                    console.error('Supabase write event failed:', err);
                }
            } else {
                // Local fallback
                const newEvent = {
                    id: Date.now(),
                    title: title,
                    event_date: date,
                    platform: platform,
                    description: desc
                };
                state.events.push(newEvent);
                localStorage.setItem('thc_events', JSON.stringify(state.events));
                renderEvents();
            }

            document.getElementById('event-title').value = '';
            document.getElementById('event-platform').value = '';
            document.getElementById('event-desc').value = '';
            modalEvent.classList.add('hidden');
        });

        // Discord settings modal triggers
        discordSettingsBtn.addEventListener('click', () => modalDiscord.classList.remove('hidden'));
        modalDiscordClose.addEventListener('click', () => modalDiscord.classList.add('hidden'));
        btnCancelDiscord.addEventListener('click', () => modalDiscord.classList.add('hidden'));
        
        btnSaveDiscord.addEventListener('click', () => {
            const guildId = discordGuildIdInput.value.trim();
            state.discordGuildId = guildId;
            localStorage.setItem('thc_discord_guild_id', guildId);
            modalDiscord.classList.add('hidden');
            fetchRealDiscordWidget();
        });

        // Chat settings
        chatSettingsToggle.addEventListener('click', () => {
            chatConfigBar.classList.toggle('hidden');
        });

        btnSaveChatProfile.addEventListener('click', () => {
            const name = chatUsernameInput.value.trim();
            if (name) {
                state.chatProfile.username = name;
                localStorage.setItem('thc_chat_profile', JSON.stringify(state.chatProfile));
                chatConfigBar.classList.add('hidden');
                renderChat();
            }
        });

        btnSendMessage.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });

        // Drawing mouse handlers
        pixelCanvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            paintPixelAtCoordinates(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDrawing) paintPixelAtCoordinates(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            isDrawing = false;
        });

        // Touch handlers (mobile drawing)
        pixelCanvas.addEventListener('touchstart', (e) => {
            isDrawing = true;
            if (e.touches && e.touches[0]) {
                paintPixelAtCoordinates(e.touches[0].clientX, e.touches[0].clientY);
            }
            e.preventDefault();
        }, { passive: false });

        pixelCanvas.addEventListener('touchmove', (e) => {
            if (isDrawing && e.touches && e.touches[0]) {
                paintPixelAtCoordinates(e.touches[0].clientX, e.touches[0].clientY);
            }
            e.preventDefault();
        }, { passive: false });

        pixelCanvas.addEventListener('touchend', () => {
            isDrawing = false;
        });

        // Canvas toolbar triggers
        toolDrawBtn.addEventListener('click', () => {
            state.activeTool = 'draw';
            updateToolButtons();
        });

        toolEraseBtn.addEventListener('click', () => {
            state.activeTool = 'erase';
            updateToolButtons();
        });

        toolGridToggleBtn.addEventListener('click', () => {
            state.showPixelGrid = !state.showPixelGrid;
            toolGridToggleBtn.classList.toggle('active', state.showPixelGrid);
            drawPixelBoard();
        });

        btnClearCanvas.addEventListener('click', () => {
            if (confirm('¿Seguro que quieres limpiar todo el mural de píxeles?')) {
                state.canvasPixels = new Array(32 * 32).fill('#000000');
                localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
                drawPixelBoard();
                drawPixelPreview();
                triggerDebouncedSave();
            }
        });

        btnDownloadCanvas.addEventListener('click', () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 512;
            tempCanvas.height = 512;
            const tempCtx = tempCanvas.getContext('2d');
            const cellSize = 512 / logicalGridSize;

            tempCtx.fillStyle = '#020402';
            tempCtx.fillRect(0, 0, 512, 512);

            for (let y = 0; y < logicalGridSize; y++) {
                for (let x = 0; x < logicalGridSize; x++) {
                    const color = state.canvasPixels[y * logicalGridSize + x];
                    if (color && color !== '#000000') {
                        tempCtx.fillStyle = color;
                        tempCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }

            const image = tempCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            const link = document.createElement('a');
            link.download = 'thc_pixel_art.png';
            link.href = image;
            link.click();
        });
    }

    // --- UTILS ---
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Start App
    init();
});
