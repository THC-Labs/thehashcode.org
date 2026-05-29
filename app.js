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
        canvasPixels: [], // 64x64 color grid (4096 strings)
        discordGuildId: '',
        isDiscordReal: false,
        isSupabaseReal: false,
        previewOffset: {
            left: -Math.floor(Math.random() * (512 - 220)),
            top: -Math.floor(Math.random() * (512 - 220))
        },
        soundEnabled: true,
        
        // Snapchat State
        snapNick: '',
        snapCode: '',
        snapActiveSubtab: 'snap-feed-subtab',
        snapPhotos: [],
        snapStreaks: [],
        snapActiveUsers: [],
        cameraStream: null,
        capturedImageBase64: '',
        currentPlayingStories: [],
        currentStoryIndex: 0,
        storyTimer: null,
        calendarCurrentMonth: new Date().getMonth(),
        calendarCurrentYear: new Date().getFullYear(),
        
        // Trivia State
        triviaPlayerName: '',
        triviaCurrentIndex: 0,
        triviaCurrentScore: 0,
        triviaCorrectAnswers: 0,
        triviaSecondsRemaining: 15,
        triviaTimerInterval: null,
        triviaQuestions: [],
        triviaCustomQuestions: [],
        triviaHighscore: 0,
        triviaGamesPlayed: 0
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

        // Premium features: audio player & background particles
        initMusicPlayer();
        initParticleSystem();

        // Initialise Snapchat, Trivia & Email Request engines
        initSnapChat();
        initTrivia();
        initEmailRequest();

        // Start Sync / Polling Loops (CORS discord & Supabase)
        setInterval(fetchChatMessages, 4000);   // Chat polls every 4s
        setInterval(fetchPixelBoard, 5000);     // Pixel Canvas polls every 5s
        setInterval(fetchGamingEvents, 8000);   // Events poll every 8s
        setInterval(fetchRealDiscordWidget, 15000); // Discord widget polls every 15s
        setInterval(syncSnapData, 6000);        // Snapchat syncs every 6s
        setInterval(syncTriviaLeaderboard, 10000); // Trivia scoreboard syncs every 10s
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
        const storedApps = localStorage.getItem('thc_apps_v2');
        if (storedApps) {
            state.apps = JSON.parse(storedApps);
        } else {
            // Default real apps
            state.apps = [
                { id: 1, name: 'THC Games Hub', url: 'https://games.thehashcode.org', desc: 'Zona de ocio y videojuegos retro del grupo.', icon: 'fa-gamepad', color: 'green' },
                { id: 2, name: 'Despensia Portal', url: 'https://despensia.thehashcode.org', desc: 'Gestor compartido de despensa e inventario de cocina.', icon: 'fa-cart-shopping', color: 'brown' }
            ];
            localStorage.setItem('thc_apps_v2', JSON.stringify(state.apps));
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
            
            // App card hover sound
            card.addEventListener('mouseenter', playHoverSound);
            
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
        localStorage.setItem('thc_apps_v2', JSON.stringify(state.apps));
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
                    // Play chime sound only if this is not the initial load and it's a new message
                    if (state.chatMessages.length > 0) {
                        playChimeSound();
                    }
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
        let text = chatInput.value.trim();
        if (!text) return;

        // CHAT COMMANDS PARSER
        if (text.startsWith('/')) {
            const command = text.split(' ')[0].toLowerCase();
            const args = text.substring(command.length).trim();
            
            if (command === '/dado') {
                const roll = Math.floor(Math.random() * 6) + 1;
                text = `🎲 ha tirado un dado y le ha salido un *${roll}*.`;
            } else if (command === '/moneda') {
                const coin = Math.random() > 0.5 ? 'CARA' : 'CRUZ';
                text = `🪙 ha lanzado una moneda y ha salido *${coin}*.`;
            } else if (command === '/troll') {
                const target = args || 'alguien';
                const trolls = [
                    "diciendo que juega con el monitor apagado.",
                    "diciendo que le da miedo jugar clasificatorias.",
                    "recordándole la vez que se cayó en la lava en Minecraft.",
                    "diciendo que huele a queso rancio.",
                    "diciendo que es el carry del grupo (pero al revés).",
                    "afirmando que todavía no sabe cómo se recarga en CS2."
                ];
                const randomTroll = trolls[Math.floor(Math.random() * trolls.length)];
                text = `🤪 ha troleado a **${target}** ${randomTroll}`;
            }
        }

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
    const logicalGridSize = 64;
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

                if (data && Array.isArray(data.pixels) && data.pixels.length === 4096) {
                    if (JSON.stringify(data.pixels) !== JSON.stringify(state.canvasPixels)) {
                        state.canvasPixels = data.pixels;
                        drawPixelBoard();
                        drawPixelPreview();
                    }
                } else if (!data || data.pixels.length !== 4096) {
                    // Create/reset board if missing or outdated in cloud
                    const emptyGrid = new Array(64 * 64).fill('#000000');
                    await supabase.from('thc_pixel_board').upsert({ id: 1, pixels: emptyGrid });
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
                if (parsed.length === 4096) {
                    if (JSON.stringify(parsed) !== JSON.stringify(state.canvasPixels)) {
                        state.canvasPixels = parsed;
                        drawPixelBoard();
                        drawPixelPreview();
                    }
                } else {
                    state.canvasPixels = new Array(64 * 64).fill('#000000');
                    localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
                    drawPixelBoard();
                    drawPixelPreview();
                }
            } else {
                state.canvasPixels = new Array(64 * 64).fill('#000000');
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

        // Position the canvas inside the window container using our saved random offset
        pixelCanvasPreview.style.left = `${state.previewOffset.left}px`;
        pixelCanvasPreview.style.top = `${state.previewOffset.top}px`;

        const width = pixelCanvasPreview.width;
        const height = pixelCanvasPreview.height;
        const cellSize = width / logicalGridSize; // 512 / 64 = 8px

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
                
                // Play pop sound
                playPopSound();
                
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
            localStorage.setItem('thc_apps_v2', JSON.stringify(state.apps));
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
                state.canvasPixels = new Array(64 * 64).fill('#000000');
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

        // Sound toggle trigger
        const btnSoundToggle = document.getElementById('btn-sound-toggle');
        if (btnSoundToggle) {
            btnSoundToggle.addEventListener('click', () => {
                state.soundEnabled = !state.soundEnabled;
                btnSoundToggle.innerHTML = state.soundEnabled 
                    ? '<i class="fa-solid fa-volume-high"></i>' 
                    : '<i class="fa-solid fa-volume-xmark"></i>';
                btnSoundToggle.title = state.soundEnabled ? 'Silenciar Sonidos' : 'Activar Sonidos';
                playChimeSound(); // Play chime to confirm
            });
        }
        
        // Add hover sounds to buttons
        const addHoverListeners = () => {
            document.querySelectorAll('.btn, .tab-btn, .social-btn, .tool-btn, .player-btn, .btn-icon, .btn-icon-green, .modal-close, .app-card').forEach(el => {
                el.removeEventListener('mouseenter', playHoverSound);
                el.addEventListener('mouseenter', playHoverSound);
            });
        };
        addHoverListeners();
        // Re-apply when DOM changes
        const observer = new MutationObserver(addHoverListeners);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- SYNTHESIZED SOUND EFFECTS (Web Audio API) ---
    function playPopSound() {
        if (!state.soundEnabled) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, audioCtx.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.08); 
            
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08); 
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } catch(e) {}
    }

    function playChimeSound() {
        if (!state.soundEnabled) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const now = audioCtx.currentTime;
            
            const playNote = (freq, start, duration) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0.05, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start(start);
                osc.stop(start + duration);
            };
            
            playNote(523.25, now, 0.12); // C5
            playNote(659.25, now + 0.08, 0.2); // E5
        } catch(e) {}
    }

    function playHoverSound() {
        if (!state.soundEnabled) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.03);
            
            gain.gain.setValueAtTime(0.004, audioCtx.currentTime); 
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.03);
        } catch(e) {}
    }

    // --- BACKGROUND PARTICLE SYSTEM (Leaves, Sparks, Butts) ---
    function initParticleSystem() {
        const container = document.createElement('div');
        container.className = 'particle-container';
        document.body.appendChild(container);

        // Spawn particles periodically
        setInterval(() => {
            const activeParticles = container.querySelectorAll('.particle');
            if (activeParticles.length >= 60) return; // safeguard performance

            const particle = document.createElement('div');
            particle.className = 'particle';

            // Decide particle type: 50% leaf, 35% spark, 15% butt (colilla)
            const rand = Math.random();
            if (rand < 0.5) {
                particle.classList.add('leaf');
                // Random leaf parameters
                const size = 6 + Math.random() * 12; // 6px to 18px
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${Math.random() * 100}vw`;
                particle.style.top = `-25px`;
                
                const speed = 6 + Math.random() * 10; // 6s to 16s
                particle.style.animationDuration = `${speed}s`;
                
                const driftMid = 20 + Math.random() * 60;
                const driftEnd = 40 + Math.random() * 100;
                particle.style.setProperty('--drift-mid', `${driftMid}px`);
                particle.style.setProperty('--drift-end', `${driftEnd}px`);
            } else if (rand < 0.85) {
                particle.classList.add('spark');
                // Random spark parameters (sparks rise from bottom)
                const size = 2 + Math.random() * 4; // 2px to 6px
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${Math.random() * 100}vw`;
                particle.style.top = `102vh`;
                
                const speed = 4 + Math.random() * 6; // 4s to 10s
                particle.style.animationDuration = `${speed}s`;
                
                const driftMid = -30 + Math.random() * 60;
                const driftEnd = -50 + Math.random() * 100;
                particle.style.setProperty('--drift-mid', `${driftMid}px`);
                particle.style.setProperty('--drift-end', `${driftEnd}px`);
            } else {
                particle.classList.add('butt');
                // Joint butt (colilla tip) falls from top
                particle.style.left = `${Math.random() * 100}vw`;
                particle.style.top = `-25px`;
                
                const speed = 8 + Math.random() * 9; // 8s to 17s
                particle.style.animationDuration = `${speed}s`;
                
                const driftMid = 10 + Math.random() * 40;
                const driftEnd = 20 + Math.random() * 80;
                particle.style.setProperty('--drift-mid', `${driftMid}px`);
                particle.style.setProperty('--drift-end', `${driftEnd}px`);
            }

            container.appendChild(particle);

            // Clean up particle DOM node after animation finishes
            const animDuration = parseFloat(particle.style.animationDuration) * 1000;
            setTimeout(() => {
                particle.remove();
            }, animDuration + 100);

        }, 350);
    }

    // --- LOFI AUDIO PLAYER ---
    function initMusicPlayer() {
        const playBtn = document.getElementById('btn-music-play');
        const waveVis = document.getElementById('wave-vis');
        const audio = document.getElementById('lofi-audio');
        const volSlider = document.getElementById('music-volume');

        if (!playBtn || !audio) return;

        // Set volume
        audio.volume = volSlider ? volSlider.value : 0.4;

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                // Play audio stream
                audio.play()
                    .then(() => {
                        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        playBtn.classList.add('active');
                        if (waveVis) waveVis.classList.add('playing');
                    })
                    .catch(err => {
                        console.error('Audio play blocked or stream down:', err);
                        alert('Error al reproducir el streaming. Inténtalo de nuevo.');
                    });
            } else {
                audio.pause();
                playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                playBtn.classList.remove('active');
                if (waveVis) waveVis.classList.remove('playing');
            }
        });

        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                audio.volume = e.target.value;
            });
        }
    }

    // ==========================================
    // SNAPCHAT THC ENGINE
    // ==========================================
    function initSnapChat() {
        const loginContainer = document.getElementById('snap-login-container');
        const mainContainer = document.getElementById('snap-main-container');
        const nickInput = document.getElementById('snap-nick-input');
        const codeInput = document.getElementById('snap-code-input');
        const btnLogin = document.getElementById('btn-snap-login');
        const btnLogout = document.getElementById('btn-snap-logout');
        
        // Subtab switching
        const subtabButtons = document.querySelectorAll('.snap-tab-btn');
        const subtabViews = document.querySelectorAll('.snap-subtab-view');
        
        // Camera selectors
        const btnToggleCam = document.getElementById('btn-toggle-camera');
        const btnCapture = document.getElementById('btn-capture-snap');
        const btnRetake = document.getElementById('btn-retake-snap');
        const fileInput = document.getElementById('snap-file-input');
        const btnSend = document.getElementById('btn-send-snap');
        
        // Story viewer selectors
        const storyModal = document.getElementById('modal-story-viewer');
        const btnCloseStory = document.getElementById('btn-close-story');
        
        // Calendar selectors
        const btnPrevMonth = document.getElementById('btn-prev-month');
        const btnNextMonth = document.getElementById('btn-next-month');

        // Check for existing session
        const savedNick = localStorage.getItem('thc_snap_nick');
        const savedCode = localStorage.getItem('thc_snap_code');
        
        if (savedNick && savedCode) {
            state.snapNick = savedNick;
            state.snapCode = savedCode;
            
            loginContainer.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            
            document.getElementById('snap-user-display').textContent = state.snapNick;
            document.getElementById('snap-room-display').textContent = state.snapCode;
            
            syncSnapData();
        }

        // Login handler
        if (btnLogin) {
            btnLogin.addEventListener('click', () => {
                const nick = nickInput.value.trim();
                const code = codeInput.value.trim().toUpperCase();
                
                if (!nick || !code) {
                    alert('Por favor, introduce un apodo y código de sala.');
                    return;
                }
                
                state.snapNick = nick;
                state.snapCode = code;
                
                localStorage.setItem('thc_snap_nick', nick);
                localStorage.setItem('thc_snap_code', code);
                
                loginContainer.classList.add('hidden');
                mainContainer.classList.remove('hidden');
                
                document.getElementById('snap-user-display').textContent = nick;
                document.getElementById('snap-room-display').textContent = code;
                
                playChimeSound();
                syncSnapData();
            });
        }

        // Logout handler
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                stopCamera();
                state.snapNick = '';
                state.snapCode = '';
                localStorage.removeItem('thc_snap_nick');
                localStorage.removeItem('thc_snap_code');
                
                loginContainer.classList.remove('hidden');
                mainContainer.classList.add('hidden');
                
                playPopSound();
            });
        }

        // Subtab toggle
        subtabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                subtabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const target = btn.getAttribute('data-snap-subtab');
                subtabViews.forEach(view => {
                    const isTarget = view.id === target;
                    view.classList.toggle('hidden', !isTarget);
                });
                
                state.snapActiveSubtab = target;
                playHoverSound();
                
                // If exiting camera subtab, stop streaming
                if (target !== 'snap-camera-subtab') {
                    stopCamera();
                } else {
                    // Reset fields
                    document.getElementById('snap-caption-input').value = '';
                }

                if (target === 'snap-archive-subtab') {
                    renderCalendar();
                }
            });
        });

        // Camera handlers
        if (btnToggleCam) {
            btnToggleCam.addEventListener('click', () => {
                if (state.cameraStream) {
                    stopCamera();
                } else {
                    startCamera();
                }
                playPopSound();
            });
        }

        if (btnCapture) {
            btnCapture.addEventListener('click', () => {
                captureSnap();
                playPopSound();
            });
        }

        if (btnRetake) {
            btnRetake.addEventListener('click', () => {
                document.getElementById('captured-preview').classList.add('hidden');
                document.getElementById('camera-video').classList.remove('hidden');
                btnCapture.classList.remove('hidden');
                btnRetake.classList.add('hidden');
                btnSend.disabled = true;
                state.capturedImageBase64 = '';
                startCamera();
                playPopSound();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', handleFileInput);
        }

        if (btnSend) {
            btnSend.addEventListener('click', () => {
                sendSnap();
            });
        }

        // Close Story
        if (btnCloseStory) {
            btnCloseStory.addEventListener('click', () => {
                storyModal.classList.add('hidden');
                if (state.storyTimer) clearInterval(state.storyTimer);
                state.storyTimer = null;
                playPopSound();
            });
        }

        // Calendar Month switches
        if (btnPrevMonth) {
            btnPrevMonth.addEventListener('click', () => {
                state.calendarCurrentMonth--;
                if (state.calendarCurrentMonth < 0) {
                    state.calendarCurrentMonth = 11;
                    state.calendarCurrentYear--;
                }
                renderCalendar();
                playHoverSound();
            });
        }

        if (btnNextMonth) {
            btnNextMonth.addEventListener('click', () => {
                state.calendarCurrentMonth++;
                if (state.calendarCurrentMonth > 11) {
                    state.calendarCurrentMonth = 0;
                    state.calendarCurrentYear++;
                }
                renderCalendar();
                playHoverSound();
            });
        }
    }

    // Camera capture methods
    async function startCamera() {
        try {
            state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            const video = document.getElementById('camera-video');
            video.srcObject = state.cameraStream;
            video.classList.remove('hidden');
            document.getElementById('captured-preview').classList.add('hidden');
            document.getElementById('btn-capture-snap').classList.remove('hidden');
            document.getElementById('btn-retake-snap').classList.add('hidden');
            document.getElementById('camera-status-text').textContent = 'Cámara Activa';
            document.getElementById('btn-toggle-camera').innerHTML = '<i class="fa-solid fa-power-off"></i> Apagar Cámara';
        } catch (err) {
            console.error('Camera access denied:', err);
            alert('No se pudo acceder a la cámara. Prueba a subir una imagen local.');
            stopCamera();
        }
    }

    function stopCamera() {
        if (state.cameraStream) {
            state.cameraStream.getTracks().forEach(track => track.stop());
            state.cameraStream = null;
        }
        const video = document.getElementById('camera-video');
        if (video) video.srcObject = null;
        const btnCapture = document.getElementById('btn-capture-snap');
        if (btnCapture) btnCapture.classList.add('hidden');
        const statusText = document.getElementById('camera-status-text');
        if (statusText) statusText.textContent = 'Cámara apagada';
        const btnToggleCam = document.getElementById('btn-toggle-camera');
        if (btnToggleCam) btnToggleCam.innerHTML = '<i class="fa-solid fa-power-off"></i> Encender Cámara';
    }

    function captureSnap() {
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        const preview = document.getElementById('captured-preview');
        const btnCapture = document.getElementById('btn-capture-snap');
        const btnRetake = document.getElementById('btn-retake-snap');
        const btnSend = document.getElementById('btn-send-snap');
        
        if (!video || !canvas || !preview) return;
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctxCanvas = canvas.getContext('2d');
        ctxCanvas.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        state.capturedImageBase64 = dataUrl;
        
        preview.src = dataUrl;
        preview.classList.remove('hidden');
        video.classList.add('hidden');
        
        btnCapture.classList.add('hidden');
        btnRetake.classList.remove('hidden');
        btnSend.removeAttribute('disabled');
        
        stopCamera();
    }

    function handleFileInput(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            state.capturedImageBase64 = evt.target.result;
            const preview = document.getElementById('captured-preview');
            preview.src = evt.target.result;
            preview.classList.remove('hidden');
            document.getElementById('camera-video').classList.add('hidden');
            document.getElementById('btn-send-snap').removeAttribute('disabled');
            document.getElementById('camera-status-text').textContent = 'Imagen cargada';
            
            stopCamera();
            playPopSound();
        };
        reader.readAsDataURL(file);
    }

    async function sendSnap() {
        if (!state.capturedImageBase64) return;
        
        const caption = document.getElementById('snap-caption-input').value.trim();
        const recipient = document.getElementById('snap-recipient-select').value;
        const sendBtn = document.getElementById('btn-send-snap');
        
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
        
        const newSnap = {
            username: state.snapNick,
            room_code: state.snapCode,
            image_data: state.capturedImageBase64,
            caption: caption,
            recipient: recipient,
            likes_count: 0,
            likes_by: []
        };
        
        if (state.isSupabaseReal) {
            try {
                const { error } = await supabase
                    .from('thc_snap_photos')
                    .insert([newSnap]);
                if (error) throw error;
                
                await updateStreakRecord(recipient);
                playChimeSound();
            } catch (err) {
                console.error('Failed to upload snap:', err);
                alert('Error al enviar el Snap.');
            }
        } else {
            // Local fallback
            const snaps = JSON.parse(localStorage.getItem('thc_snap_photos_local') || '[]');
            const id = Date.now();
            const created_at = new Date().toISOString();
            const snapWithMeta = { id, created_at, ...newSnap };
            snaps.push(snapWithMeta);
            localStorage.setItem('thc_snap_photos_local', JSON.stringify(snaps));
            
            updateStreakRecordLocal(recipient);
            playChimeSound();
        }
        
        // Reset inputs & preview
        document.getElementById('snap-caption-input').value = '';
        document.getElementById('captured-preview').classList.add('hidden');
        document.getElementById('camera-video').classList.remove('hidden');
        document.getElementById('btn-send-snap').disabled = true;
        document.getElementById('btn-send-snap').innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Snap 🔥';
        state.capturedImageBase64 = '';
        
        // Switch subtab back
        const feedBtn = document.querySelector('.snap-tab-btn[data-snap-subtab="snap-feed-subtab"]');
        if (feedBtn) feedBtn.click();
        
        await syncSnapData();
    }

    async function updateStreakRecord(recipient) {
        if (!state.isSupabaseReal) return;
        const todayStr = new Date().toISOString().substring(0, 10);
        const userA = state.snapNick;
        const userB = recipient; // 'group' or specific username
        
        try {
            // Update User A -> User B streak
            const { data, error } = await supabase
                .from('thc_snap_streaks')
                .select('*')
                .eq('room_code', state.snapCode)
                .eq('user_a', userA)
                .eq('user_b', userB)
                .maybeSingle();
                
            if (error) throw error;
            
            if (data) {
                const lastDate = new Date(data.last_posted);
                const today = new Date(todayStr);
                const diffTime = today - lastDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                let newCount = data.streak_count;
                if (diffDays === 1) {
                    newCount += 1;
                } else if (diffDays > 1) {
                    newCount = 1;
                }
                
                await supabase
                    .from('thc_snap_streaks')
                    .update({ streak_count: newCount, last_posted: todayStr })
                    .eq('id', data.id);
            } else {
                await supabase
                    .from('thc_snap_streaks')
                    .insert([{
                        room_code: state.snapCode,
                        user_a: userA,
                        user_b: userB,
                        streak_count: 1,
                        last_posted: todayStr
                    }]);
            }
            
            // If individual, update User B -> User A streak as well for sync
            if (userB !== 'group') {
                const { data: data2, error: error2 } = await supabase
                    .from('thc_snap_streaks')
                    .select('*')
                    .eq('room_code', state.snapCode)
                    .eq('user_a', userB)
                    .eq('user_b', userA)
                    .maybeSingle();
                    
                if (!error2) {
                    if (data2) {
                        const lastDate = new Date(data2.last_posted);
                        const today = new Date(todayStr);
                        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                        let newCount = data2.streak_count;
                        if (diffDays === 1) newCount += 1;
                        else if (diffDays > 1) newCount = 1;
                        
                        await supabase
                            .from('thc_snap_streaks')
                            .update({ streak_count: newCount, last_posted: todayStr })
                            .eq('id', data2.id);
                    } else {
                        await supabase
                            .from('thc_snap_streaks')
                            .insert([{
                                room_code: state.snapCode,
                                user_a: userB,
                                user_b: userA,
                                streak_count: 1,
                                last_posted: todayStr
                            }]);
                    }
                }
            }
        } catch (err) {
            console.error('Streak DB update error:', err);
        }
    }

    function updateStreakRecordLocal(recipient) {
        const streaks = JSON.parse(localStorage.getItem('thc_snap_streaks_local') || '[]');
        const userA = state.snapNick;
        const userB = recipient;
        const todayStr = new Date().toISOString().substring(0, 10);
        
        const updateSingle = (a, b) => {
            let found = streaks.find(s => s.room_code === state.snapCode && s.user_a === a && s.user_b === b);
            if (found) {
                const diffDays = Math.floor((new Date(todayStr) - new Date(found.last_posted)) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) found.streak_count += 1;
                else if (diffDays > 1) found.streak_count = 1;
                found.last_posted = todayStr;
            } else {
                streaks.push({
                    room_code: state.snapCode,
                    user_a: a,
                    user_b: b,
                    streak_count: 1,
                    last_posted: todayStr
                });
            }
        };
        
        updateSingle(userA, userB);
        if (userB !== 'group') {
            updateSingle(userB, userA);
        }
        localStorage.setItem('thc_snap_streaks_local', JSON.stringify(streaks));
    }

    // Sync data (fetches, renders)
    async function syncSnapData() {
        if (!state.snapCode) return;
        
        if (state.isSupabaseReal) {
            try {
                // Fetch snaps
                const { data: photos, error: pError } = await supabase
                    .from('thc_snap_photos')
                    .select('*')
                    .eq('room_code', state.snapCode)
                    .order('created_at', { ascending: false });
                    
                if (pError) throw pError;
                state.snapPhotos = photos || [];
                
                // Fetch streaks
                const { data: streaks, error: sError } = await supabase
                    .from('thc_snap_streaks')
                    .select('*')
                    .eq('room_code', state.snapCode);
                    
                if (sError) throw sError;
                state.snapStreaks = streaks || [];
            } catch (err) {
                console.error('Error fetching snaps/streaks:', err);
            }
        } else {
            // Local fallback
            state.snapPhotos = JSON.parse(localStorage.getItem('thc_snap_photos_local') || '[]');
            state.snapPhotos = state.snapPhotos.filter(p => p.room_code === state.snapCode);
            state.snapStreaks = JSON.parse(localStorage.getItem('thc_snap_streaks_local') || '[]');
            state.snapStreaks = state.snapStreaks.filter(s => s.room_code === state.snapCode);
        }
        
        // Determine active users who have posted in this room
        const usersInRoom = new Set();
        state.snapPhotos.forEach(p => usersInRoom.add(p.username));
        usersInRoom.delete(state.snapNick); // exclude self
        state.snapActiveUsers = Array.from(usersInRoom);
        
        renderSnapSidebar();
        renderSnapFeed();
        renderRecipientDropdown();
        
        if (state.snapActiveSubtab === 'snap-archive-subtab') {
            renderCalendar();
        }
    }

    function renderSnapSidebar() {
        const groupDisplay = document.getElementById('group-streak-display');
        const streaksList = document.getElementById('snap-streaks-list');
        if (!streaksList) return;
        
        // Render Group Streak
        const groupRecord = state.snapStreaks.find(s => s.user_a === state.snapNick && s.user_b === 'group');
        const gStreak = groupRecord ? groupRecord.streak_count : 0;
        groupDisplay.textContent = `🔥 ${gStreak}`;
        
        // Render Individual Streaks
        streaksList.innerHTML = '';
        if (state.snapActiveUsers.length === 0) {
            streaksList.innerHTML = `<li style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">No hay otros miembros activos aún.</li>`;
            return;
        }
        
        state.snapActiveUsers.forEach(u => {
            const streakRecord = state.snapStreaks.find(s => s.user_a === state.snapNick && s.user_b === u);
            const count = streakRecord ? streakRecord.streak_count : 0;
            
            const card = document.createElement('li');
            card.className = 'user-streak-card';
            card.innerHTML = `
                <div class="streak-user-info">
                    <div class="streak-avatar">${u.substring(0, 2).toUpperCase()}</div>
                    <span class="streak-username">${u}</span>
                </div>
                <span class="streak-counter-pill">🔥 ${count}</span>
            `;
            
            streaksList.appendChild(card);
        });
    }

    function renderRecipientDropdown() {
        const select = document.getElementById('snap-recipient-select');
        if (!select) return;
        
        // Keep "Todos" as option 1
        select.innerHTML = '<option value="group">Todos (Muro del Grupo)</option>';
        
        state.snapActiveUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            opt.textContent = `${u} (Privado)`;
            select.appendChild(opt);
        });
    }

    function renderSnapFeed() {
        const circlesContainer = document.getElementById('stories-circles-container');
        const timeline = document.getElementById('snap-feed-timeline');
        
        if (!circlesContainer || !timeline) return;
        
        circlesContainer.innerHTML = '';
        timeline.innerHTML = '';
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Filters active snaps (last 24 hours)
        const activeSnaps = state.snapPhotos.filter(p => new Date(p.created_at) >= oneDayAgo);
        
        // Group stories by username
        const storiesByUser = {};
        activeSnaps.forEach(p => {
            // Snaps are visible if sent to 'group' or if sent to us, or if we sent them to someone
            const isVisible = p.recipient === 'group' || p.recipient === state.snapNick || p.username === state.snapNick;
            if (isVisible) {
                if (!storiesByUser[p.username]) storiesByUser[p.username] = [];
                storiesByUser[p.username].push(p);
            }
        });
        
        // Render stories bubbles
        const activeStoryUsers = Object.keys(storiesByUser);
        if (activeStoryUsers.length === 0) {
            circlesContainer.innerHTML = `<span style="font-size: 0.72rem; color: var(--text-muted); padding: 0.5rem 0.2rem;">No hay historias activas en las últimas 24h.</span>`;
        } else {
            activeStoryUsers.forEach(u => {
                const wrap = document.createElement('div');
                wrap.className = 'story-circle-wrapper';
                wrap.innerHTML = `
                    <div class="story-bubble">
                        <div class="story-bubble-inner">${u.substring(0, 2).toUpperCase()}</div>
                    </div>
                    <span class="story-circle-label">${u === state.snapNick ? 'Tú' : u}</span>
                `;
                
                wrap.addEventListener('click', () => {
                    watchStory(u, storiesByUser[u]);
                });
                circlesContainer.appendChild(wrap);
            });
        }
        
        // Render public timeline snaps (All time snaps, but showing most recent first)
        // Snaps show on public timeline ONLY if they were sent to 'group'
        const publicSnaps = state.snapPhotos.filter(p => p.recipient === 'group');
        
        if (publicSnaps.length === 0) {
            timeline.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 2rem 0;">No hay fotos compartidas en el muro grupal. ¡Captura y sube la primera!</div>`;
            return;
        }
        
        publicSnaps.forEach(p => {
            const card = document.createElement('div');
            card.className = 'feed-snap-card glass-panel';
            
            const elapsed = getElapsedString(p.created_at);
            const isLiked = p.likes_by.includes(state.snapNick);
            
            card.innerHTML = `
                <div class="snap-card-header">
                    <div class="snap-card-author-info">
                        <div class="snap-card-avatar">${p.username.substring(0,2).toUpperCase()}</div>
                        <span class="snap-card-username">${p.username}</span>
                    </div>
                    <span class="snap-card-time">${elapsed}</span>
                </div>
                <div class="snap-card-body">
                    <img src="${p.image_data}" alt="Snap">
                    ${p.caption ? `<div class="snap-card-caption-bar">${escapeHtml(p.caption)}</div>` : ''}
                </div>
                <div class="snap-card-footer">
                    <div class="snap-card-actions">
                        <button class="snap-like-btn ${isLiked ? 'liked' : ''}" data-id="${p.id}">
                            <i class="fa-solid fa-heart"></i> <span>${p.likes_count}</span>
                        </button>
                    </div>
                </div>
            `;
            
            card.querySelector('.snap-like-btn').addEventListener('click', (e) => {
                likeSnapCard(p, e.currentTarget);
            });
            
            timeline.appendChild(card);
        });
    }

    async function likeSnapCard(snap, buttonEl) {
        const isLiked = snap.likes_by.includes(state.snapNick);
        if (isLiked) return; // Snapchat allows liking once
        
        snap.likes_by.push(state.snapNick);
        snap.likes_count += 1;
        playPopSound();
        
        // Update UI button
        buttonEl.classList.add('liked');
        buttonEl.querySelector('span').textContent = snap.likes_count;
        
        // Save
        if (state.isSupabaseReal) {
            try {
                await supabase
                    .from('thc_snap_photos')
                    .update({ likes_count: snap.likes_count, likes_by: snap.likes_by })
                    .eq('id', snap.id);
            } catch (e) {
                console.error('Failed to sync like count:', e);
            }
        } else {
            const local = JSON.parse(localStorage.getItem('thc_snap_photos_local') || '[]');
            const idx = local.findIndex(x => x.id === snap.id);
            if (idx !== -1) {
                local[idx].likes_count = snap.likes_count;
                local[idx].likes_by = snap.likes_by;
                localStorage.setItem('thc_snap_photos_local', JSON.stringify(local));
            }
        }
    }

    function watchStory(username, snaps) {
        state.currentPlayingStories = snaps;
        state.currentStoryIndex = 0;
        
        const modal = document.getElementById('modal-story-viewer');
        modal.classList.remove('hidden');
        
        playNextStory();
    }

    function playNextStory() {
        if (state.currentStoryIndex >= state.currentPlayingStories.length) {
            document.getElementById('modal-story-viewer').classList.add('hidden');
            if (state.storyTimer) clearInterval(state.storyTimer);
            state.storyTimer = null;
            return;
        }
        
        const snap = state.currentPlayingStories[state.currentStoryIndex];
        const elapsed = getElapsedString(snap.created_at);
        
        document.getElementById('story-username-display').textContent = snap.username;
        document.getElementById('story-avatar-display').textContent = snap.username.substring(0, 2).toUpperCase();
        document.getElementById('story-time-display').textContent = elapsed;
        document.getElementById('story-image-display').src = snap.image_data;
        
        const capOverlay = document.getElementById('story-caption-display');
        if (snap.caption) {
            capOverlay.textContent = snap.caption;
            capOverlay.classList.remove('hidden');
        } else {
            capOverlay.classList.add('hidden');
        }
        
        document.getElementById('story-likes-count').textContent = snap.likes_count;
        
        const heartBtn = document.getElementById('btn-like-story');
        heartBtn.classList.toggle('liked', snap.likes_by.includes(state.snapNick));
        
        // Re-bind like handler
        const newHeart = heartBtn.cloneNode(true);
        heartBtn.parentNode.replaceChild(newHeart, heartBtn);
        newHeart.addEventListener('click', async () => {
            if (!snap.likes_by.includes(state.snapNick)) {
                snap.likes_by.push(state.snapNick);
                snap.likes_count += 1;
                playPopSound();
                document.getElementById('story-likes-count').textContent = snap.likes_count;
                newHeart.classList.add('liked');
                
                if (state.isSupabaseReal) {
                    await supabase
                        .from('thc_snap_photos')
                        .update({ likes_count: snap.likes_count, likes_by: snap.likes_by })
                        .eq('id', snap.id);
                } else {
                    const local = JSON.parse(localStorage.getItem('thc_snap_photos_local') || '[]');
                    const idx = local.findIndex(x => x.id === snap.id);
                    if (idx !== -1) {
                        local[idx].likes_count = snap.likes_count;
                        local[idx].likes_by = snap.likes_by;
                        localStorage.setItem('thc_snap_photos_local', JSON.stringify(local));
                    }
                }
                syncSnapData();
            }
        });
        
        // Story 5s progress bar countdown
        if (state.storyTimer) clearInterval(state.storyTimer);
        let progress = 0;
        const fillBar = document.getElementById('story-progress-fill');
        fillBar.style.width = '0%';
        
        state.storyTimer = setInterval(() => {
            progress += 2;
            fillBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(state.storyTimer);
                state.currentStoryIndex++;
                playNextStory();
            }
        }, 100);
    }

    function renderCalendar() {
        const month = state.calendarCurrentMonth;
        const year = state.calendarCurrentYear;
        
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const monthYearDisplay = document.getElementById('calendar-month-year');
        if (monthYearDisplay) monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
        
        const grid = document.getElementById('calendar-days-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        let firstDay = new Date(year, month, 1).getDay();
        firstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon=0, Sun=6
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty-day';
            grid.appendChild(empty);
        }
        
        // Group photos by day of month
        const snapsByDay = {};
        state.snapPhotos.forEach(p => {
            const date = new Date(p.created_at);
            if (date.getMonth() === month && date.getFullYear() === year) {
                const day = date.getDate();
                if (!snapsByDay[day]) snapsByDay[day] = [];
                snapsByDay[day].push(p);
            }
        });
        
        // Render days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day active-day';
            
            const numLabel = document.createElement('span');
            numLabel.className = 'calendar-day-num';
            numLabel.textContent = day;
            dayCell.appendChild(numLabel);
            
            const daySnaps = snapsByDay[day] || [];
            if (daySnaps.length > 0) {
                // Get snap with highest likes on that day
                daySnaps.sort((a, b) => b.likes_count - a.likes_count || new Date(b.created_at) - new Date(a.created_at));
                const topSnap = daySnaps[0];
                
                dayCell.classList.add('has-photo');
                
                const img = document.createElement('img');
                img.className = 'calendar-day-thumb';
                img.src = topSnap.image_data;
                dayCell.appendChild(img);
                
                const likesPill = document.createElement('span');
                likesPill.className = 'calendar-day-likes';
                likesPill.innerHTML = `<i class="fa-solid fa-heart"></i> ${topSnap.likes_count}`;
                dayCell.appendChild(likesPill);
                
                dayCell.addEventListener('click', () => {
                    showCalendarPhotoDetail(topSnap);
                });
            }
            grid.appendChild(dayCell);
        }
    }

    function showCalendarPhotoDetail(snap) {
        if (state.storyTimer) clearInterval(state.storyTimer);
        state.storyTimer = null;
        
        const modal = document.getElementById('modal-story-viewer');
        modal.classList.remove('hidden');
        
        document.getElementById('story-progress-fill').style.width = '100%';
        document.getElementById('story-username-display').textContent = snap.username;
        document.getElementById('story-avatar-display').textContent = snap.username.substring(0, 2).toUpperCase();
        document.getElementById('story-time-display').textContent = new Date(snap.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        document.getElementById('story-image-display').src = snap.image_data;
        
        const caption = document.getElementById('story-caption-display');
        if (snap.caption) {
            caption.textContent = snap.caption;
            caption.classList.remove('hidden');
        } else {
            caption.classList.add('hidden');
        }
        
        document.getElementById('story-likes-count').textContent = snap.likes_count;
        
        const heartBtn = document.getElementById('btn-like-story');
        heartBtn.classList.toggle('liked', snap.likes_by.includes(state.snapNick));
        
        const newHeart = heartBtn.cloneNode(true);
        heartBtn.parentNode.replaceChild(newHeart, heartBtn);
        newHeart.addEventListener('click', async () => {
            if (!snap.likes_by.includes(state.snapNick)) {
                snap.likes_by.push(state.snapNick);
                snap.likes_count += 1;
                playPopSound();
                document.getElementById('story-likes-count').textContent = snap.likes_count;
                newHeart.classList.add('liked');
                
                if (state.isSupabaseReal) {
                    await supabase
                        .from('thc_snap_photos')
                        .update({ likes_count: snap.likes_count, likes_by: snap.likes_by })
                        .eq('id', snap.id);
                } else {
                    const local = JSON.parse(localStorage.getItem('thc_snap_photos_local') || '[]');
                    const idx = local.findIndex(x => x.id === snap.id);
                    if (idx !== -1) {
                        local[idx].likes_count = snap.likes_count;
                        local[idx].likes_by = snap.likes_by;
                        localStorage.setItem('thc_snap_photos_local', JSON.stringify(local));
                    }
                }
                renderCalendar();
            }
        });
    }

    function getElapsedString(createdAt) {
        const diffMs = new Date() - new Date(createdAt);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 6000);
        
        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHrs < 24) return `Hace ${diffHrs} h`;
        return new Date(createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }

    // ==========================================
    // TRIVIA THC ENGINE
    // ==========================================
    const presetTriviaQuestions = [
        { question: "¿Cómo se llama el fontanero de Nintendo?", options: ["Mario", "Luigi", "Wario", "Yoshi"], correct_index: 0, category: "videojuegos", creator: "Sistema" },
        { question: "¿Qué lenguaje se usa principalmente para dar estilo a páginas web?", options: ["HTML", "Python", "CSS", "C++"], correct_index: 2, category: "tecnologia", creator: "Sistema" },
        { question: "¿Qué juego popular presenta bloques y creepers?", options: ["Roblox", "Minecraft", "Terraria", "Fortnite"], correct_index: 1, category: "videojuegos", creator: "Sistema" },
        { question: "¿Cuál es el puerto por defecto de HTTP?", options: ["443", "22", "80", "8080"], correct_index: 2, category: "tecnologia", creator: "Sistema" },
        { question: "¿En qué año se estrenó la película original de Star Wars (Episodio IV)?", options: ["1975", "1977", "1980", "1983"], correct_index: 1, category: "cultura", creator: "Sistema" },
        { question: "¿Cuál de estos NO es un lenguaje de programación?", options: ["TypeScript", "Rust", "Markdown", "Go"], correct_index: 2, category: "tecnologia", creator: "Sistema" },
        { question: "¿Cómo se llama el protagonista de la saga Half-Life?", options: ["Gordon Freeman", "John 117", "G-Man", "Barney Calhoun"], correct_index: 0, category: "videojuegos", creator: "Sistema" },
        { question: "¿Qué compañía desarrolló la consola PlayStation?", options: ["Microsoft", "Sony", "Nintendo", "Sega"], correct_index: 1, category: "videojuegos", creator: "Sistema" },
        { question: "¿Qué protocolo cifra las páginas web?", options: ["HTTP", "FTP", "HTTPS", "SMTP"], correct_index: 2, category: "tecnologia", creator: "Sistema" },
        { question: "¿Cómo se llama el actor que interpreta a Iron Man en Marvel?", options: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Tom Holland"], correct_index: 1, category: "cultura", creator: "Sistema" },
        { question: "¿Qué estudio desarrolló CD Projekt Red, creador de Cyberpunk 2077?", options: ["CD Projekt Red", "Bethesda", "Ubisoft", "Rockstar Games"], correct_index: 0, category: "videojuegos", creator: "Sistema" },
        { question: "¿Qué etiqueta HTML se usa para enlaces hipertexto?", options: ["<link>", "<a>", "<href>", "<route>"], correct_index: 1, category: "tecnologia", creator: "Sistema" },
        { question: "¿Quién escribió la famosa obra literaria Don Quijote?", options: ["Federico García Lorca", "Miguel de Cervantes", "Lope de Vega", "Francisco de Quevedo"], correct_index: 1, category: "cultura", creator: "Sistema" },
        { question: "¿Cuál es el Pokémon inicial de tipo fuego en la primera generación?", options: ["Bulbasaur", "Squirtle", "Charmander", "Pikachu"], correct_index: 2, category: "videojuegos", creator: "Sistema" },
        { question: "¿Qué framework de Javascript fue creado por Facebook?", options: ["Angular", "Vue", "Svelte", "React"], correct_index: 3, category: "tecnologia", creator: "Sistema" }
    ];

    function initTrivia() {
        const btnStart = document.getElementById('btn-start-trivia');
        const btnToggleCreator = document.getElementById('btn-toggle-question-creator');
        const btnCloseCreator = document.getElementById('btn-close-creator');
        const btnSubmitQ = document.getElementById('btn-submit-question');
        const btnSaveSc = document.getElementById('btn-save-score');
        const btnRestart = document.getElementById('btn-trivia-restart');
        
        const playerNameInput = document.getElementById('trivia-player-name');
        
        // Load local records
        state.triviaHighscore = parseInt(localStorage.getItem('thc_trivia_highscore') || '0');
        state.triviaGamesPlayed = parseInt(localStorage.getItem('thc_trivia_games_played') || '0');
        
        document.getElementById('trivia-high-score').textContent = `${state.triviaHighscore} pts`;
        document.getElementById('trivia-games-played').textContent = state.triviaGamesPlayed;
        
        // Auto fill nick if Snapchat nick exists
        const snapNick = localStorage.getItem('thc_snap_nick');
        if (snapNick && playerNameInput) {
            playerNameInput.value = snapNick;
        }

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                const name = playerNameInput.value.trim();
                if (!name) {
                    alert('Por favor, introduce tu nombre para jugar.');
                    return;
                }
                state.triviaPlayerName = name;
                startTriviaGame();
                playChimeSound();
            });
        }

        if (btnToggleCreator) {
            btnToggleCreator.addEventListener('click', () => {
                document.getElementById('trivia-question-creator').classList.toggle('hidden');
                playPopSound();
            });
        }

        if (btnCloseCreator) {
            btnCloseCreator.addEventListener('click', () => {
                document.getElementById('trivia-question-creator').classList.add('hidden');
                playPopSound();
            });
        }

        if (btnSubmitQ) {
            btnSubmitQ.addEventListener('click', submitCustomQuestion);
        }

        if (btnSaveSc) {
            btnSaveSc.addEventListener('click', saveTriviaScore);
        }

        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                document.getElementById('trivia-summary').classList.add('hidden');
                document.getElementById('trivia-lobby').classList.remove('hidden');
                playPopSound();
            });
        }

        syncTriviaLeaderboard();
        fetchCustomQuestions();
    }

    async function fetchCustomQuestions() {
        if (state.isSupabaseReal) {
            try {
                const { data, error } = await supabase
                    .from('thc_trivia_questions')
                    .select('*');
                if (!error && data) {
                    state.triviaCustomQuestions = data;
                }
            } catch (e) {
                console.error('Failed to fetch custom trivia questions:', e);
            }
        } else {
            state.triviaCustomQuestions = JSON.parse(localStorage.getItem('thc_trivia_questions_local') || '[]');
        }
    }

    async function submitCustomQuestion() {
        const qText = document.getElementById('create-q-text').value.trim();
        const options = Array.from(document.querySelectorAll('.create-q-option')).map(input => input.value.trim());
        const correctIdx = parseInt(document.getElementById('create-q-correct').value);
        const category = document.getElementById('create-q-category').value;
        const creator = state.triviaPlayerName || 'Anónimo';
        
        if (!qText || options.some(opt => !opt)) {
            alert('Por favor, rellena la pregunta y las 4 opciones.');
            return;
        }
        
        const newQ = {
            question: qText,
            options: options,
            correct_index: correctIdx,
            category: category,
            creator: creator
        };
        
        const submitBtn = document.getElementById('btn-submit-question');
        submitBtn.disabled = true;
        
        if (state.isSupabaseReal) {
            try {
                const { error } = await supabase
                    .from('thc_trivia_questions')
                    .insert([newQ]);
                if (error) throw error;
                alert('¡Pregunta guardada con éxito en la base de datos!');
            } catch (err) {
                console.error('Failed to submit question:', err);
                alert('Error al guardar la pregunta.');
            }
        } else {
            // Local
            const localQ = JSON.parse(localStorage.getItem('thc_trivia_questions_local') || '[]');
            localQ.push(newQ);
            localStorage.setItem('thc_trivia_questions_local', JSON.stringify(localQ));
            alert('Pregunta guardada en la base de datos local sandbox.');
        }
        
        // Reset fields
        document.getElementById('create-q-text').value = '';
        document.querySelectorAll('.create-q-option').forEach(input => input.value = '');
        document.getElementById('trivia-question-creator').classList.add('hidden');
        submitBtn.disabled = false;
        
        playChimeSound();
        fetchCustomQuestions();
    }

    // Game loop logic
    function startTriviaGame() {
        document.getElementById('trivia-lobby').classList.add('hidden');
        document.getElementById('trivia-game').classList.remove('hidden');
        
        state.triviaCurrentIndex = 0;
        state.triviaCurrentScore = 0;
        state.triviaCorrectAnswers = 0;
        
        // Combine preset and custom questions
        let allQuestions = [...presetTriviaQuestions, ...state.triviaCustomQuestions];
        
        // Filter by category
        const cat = document.getElementById('trivia-category-select').value;
        if (cat !== 'all') {
            allQuestions = allQuestions.filter(q => q.category === cat);
        }
        
        // Fallback if no questions found in category
        if (allQuestions.length === 0) {
            allQuestions = [...presetTriviaQuestions];
        }
        
        // Shuffle questions
        allQuestions.sort(() => Math.random() - 0.5);
        state.triviaQuestions = allQuestions.slice(0, 10); // play 10 questions
        
        showTriviaQuestion();
    }

    function showTriviaQuestion() {
        if (state.triviaCurrentIndex >= state.triviaQuestions.length) {
            endTriviaGame();
            return;
        }
        
        const q = state.triviaQuestions[state.triviaCurrentIndex];
        
        document.getElementById('trivia-current-index').textContent = state.triviaCurrentIndex + 1;
        document.getElementById('trivia-total-count').textContent = state.triviaQuestions.length;
        document.getElementById('trivia-current-score').textContent = state.triviaCurrentScore;
        
        const progressPercent = ((state.triviaCurrentIndex) / state.triviaQuestions.length) * 100;
        document.getElementById('trivia-progress-fill').style.width = `${progressPercent}%`;
        
        document.getElementById('trivia-question-category').textContent = q.category.toUpperCase();
        document.getElementById('trivia-question-text').textContent = q.question;
        
        // Options container
        const container = document.getElementById('trivia-options-container');
        container.innerHTML = '';
        
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'trivia-option-btn';
            btn.innerHTML = `<span class="option-lbl">${String.fromCharCode(65 + idx)})</span> ${escapeHtml(opt)}`;
            
            btn.addEventListener('click', () => {
                handleOptionSelection(idx, btn);
            });
            
            container.appendChild(btn);
        });
        
        startQuestionTimer();
    }

    function startQuestionTimer() {
        if (state.triviaTimerInterval) clearInterval(state.triviaTimerInterval);
        
        state.triviaSecondsRemaining = 15;
        const timeDisplay = document.getElementById('trivia-seconds-remaining');
        const fillBar = document.getElementById('trivia-timer-fill');
        
        timeDisplay.textContent = state.triviaSecondsRemaining;
        fillBar.style.width = '100%';
        fillBar.style.backgroundColor = '#22c55e';
        
        state.triviaTimerInterval = setInterval(() => {
            state.triviaSecondsRemaining -= 0.1;
            const secondsInt = Math.ceil(state.triviaSecondsRemaining);
            timeDisplay.textContent = secondsInt > 0 ? secondsInt : 0;
            
            const pct = (state.triviaSecondsRemaining / 15) * 100;
            fillBar.style.width = `${pct}%`;
            
            // Color shifts
            if (state.triviaSecondsRemaining > 10) {
                fillBar.style.backgroundColor = '#22c55e'; // green
            } else if (state.triviaSecondsRemaining > 5) {
                fillBar.style.backgroundColor = '#f97316'; // orange
            } else {
                fillBar.style.backgroundColor = '#ef4444'; // red
            }
            
            if (state.triviaSecondsRemaining <= 0) {
                clearInterval(state.triviaTimerInterval);
                handleTimeOut();
            }
        }, 100);
    }

    function handleOptionSelection(selectedIdx, clickedBtn) {
        clearInterval(state.triviaTimerInterval);
        
        const q = state.triviaQuestions[state.triviaCurrentIndex];
        const optionButtons = document.querySelectorAll('.trivia-option-btn');
        
        // Disable click handlers
        optionButtons.forEach(btn => btn.disabled = true);
        
        const toast = document.getElementById('trivia-feedback-toast');
        toast.classList.remove('hidden');
        
        if (selectedIdx === q.correct_index) {
            // Correct!
            clickedBtn.classList.add('correct');
            state.triviaCorrectAnswers++;
            
            // Calculate speed score: 50 base points + remaining seconds * 3.3 (max 100 total)
            const speedPoints = Math.floor(state.triviaSecondsRemaining * 3.3);
            const gained = 50 + speedPoints;
            state.triviaCurrentScore += gained;
            
            toast.className = 'trivia-feedback-toast';
            toast.style.borderColor = '#22c55e';
            toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #22c55e;"></i> ¡Correcto! +${gained} pts`;
            
            playChimeSound();
        } else {
            // Incorrect
            clickedBtn.classList.add('incorrect');
            optionButtons[q.correct_index].classList.add('correct');
            
            toast.className = 'trivia-feedback-toast';
            toast.style.borderColor = '#ef4444';
            toast.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> ¡Incorrecto!`;
            
            // Play fail buzz
            playPopSound();
        }
        
        setTimeout(() => {
            toast.classList.add('hidden');
            state.triviaCurrentIndex++;
            showTriviaQuestion();
        }, 2200);
    }

    function handleTimeOut() {
        const q = state.triviaQuestions[state.triviaCurrentIndex];
        const optionButtons = document.querySelectorAll('.trivia-option-btn');
        optionButtons.forEach(btn => btn.disabled = true);
        
        // Highlight correct option
        optionButtons[q.correct_index].classList.add('correct');
        
        const toast = document.getElementById('trivia-feedback-toast');
        toast.classList.remove('hidden');
        toast.className = 'trivia-feedback-toast';
        toast.style.borderColor = '#ef4444';
        toast.innerHTML = `<i class="fa-solid fa-hourglass-end" style="color: #ef4444;"></i> ¡Tiempo agotado!`;
        
        playPopSound();
        
        setTimeout(() => {
            toast.classList.add('hidden');
            state.triviaCurrentIndex++;
            showTriviaQuestion();
        }, 2200);
    }

    function endTriviaGame() {
        if (state.triviaTimerInterval) clearInterval(state.triviaTimerInterval);
        
        document.getElementById('trivia-game').classList.add('hidden');
        document.getElementById('trivia-summary').classList.remove('hidden');
        
        document.getElementById('res-score').textContent = state.triviaCurrentScore;
        document.getElementById('res-correct').textContent = `${state.triviaCorrectAnswers}/${state.triviaQuestions.length}`;
        
        // Update stats
        state.triviaGamesPlayed++;
        localStorage.setItem('thc_trivia_games_played', state.triviaGamesPlayed);
        document.getElementById('trivia-games-played').textContent = state.triviaGamesPlayed;
        
        if (state.triviaCurrentScore > state.triviaHighscore) {
            state.triviaHighscore = state.triviaCurrentScore;
            localStorage.setItem('thc_trivia_highscore', state.triviaHighscore);
            document.getElementById('trivia-high-score').textContent = `${state.triviaHighscore} pts`;
            playChimeSound();
        }
        
        // Reset save score button
        const saveBtn = document.getElementById('btn-save-score');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Guardar Puntuación en el Ranking';
    }

    async function saveTriviaScore() {
        const saveBtn = document.getElementById('btn-save-score');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        
        const newRecord = {
            username: state.triviaPlayerName,
            score: state.triviaCurrentScore,
            correct_answers: state.triviaCorrectAnswers,
            total_questions: state.triviaQuestions.length
        };
        
        if (state.isSupabaseReal) {
            try {
                const { error } = await supabase
                    .from('thc_trivia_leaderboard')
                    .insert([newRecord]);
                if (error) throw error;
                alert('¡Puntuación guardada en la clasificación de Supabase!');
            } catch (err) {
                console.error('Failed to save score:', err);
                alert('Error al sincronizar puntuación.');
            }
        } else {
            // Local
            const localLb = JSON.parse(localStorage.getItem('thc_trivia_leaderboard_local') || '[]');
            localLb.push(newRecord);
            localStorage.setItem('thc_trivia_leaderboard_local', JSON.stringify(localLb));
            alert('Puntuación guardada localmente.');
        }
        
        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado';
        
        syncTriviaLeaderboard();
        playChimeSound();
    }

    async function syncTriviaLeaderboard() {
        let records = [];
        if (state.isSupabaseReal) {
            try {
                const { data, error } = await supabase
                    .from('thc_trivia_leaderboard')
                    .select('*')
                    .order('score', { ascending: false })
                    .limit(10);
                if (!error && data) records = data;
            } catch (e) {
                console.error('Failed to sync trivia leaderboard:', e);
            }
        } else {
            records = JSON.parse(localStorage.getItem('thc_trivia_leaderboard_local') || '[]');
            records.sort((a, b) => b.score - a.score);
            records = records.slice(0, 10);
        }
        
        const container = document.getElementById('trivia-leaderboard-container');
        if (!container) return;
        
        container.innerHTML = '';
        if (records.length === 0) {
            container.innerHTML = `<li style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">No hay puntuaciones registradas. ¡Sé el primero!</li>`;
            return;
        }
        
        records.forEach((rec, idx) => {
            const item = document.createElement('li');
            item.className = 'trivia-leaderboard-item';
            
            const medal = idx === 0 ? '👑' : `[${idx + 1}]`;
            
            item.innerHTML = `
                <span class="rank-num">${medal}</span>
                <span class="player-name">${rec.username}</span>
                <span class="player-score">${rec.score} pts</span>
            `;
            container.appendChild(item);
        });
    }

    // ==========================================
    // EMAIL ALIAS REQUESTS ENGINE
    // ==========================================
    function initEmailRequest() {
        const btnSubmit = document.getElementById('btn-submit-email-request');
        const aliasInput = document.getElementById('email-alias-input');
        const forwardInput = document.getElementById('email-forward-input');

        if (!btnSubmit) return;

        btnSubmit.addEventListener('click', async () => {
            const alias = aliasInput.value.trim().toLowerCase();
            const forward = forwardInput.value.trim().toLowerCase();

            // Validation
            if (!alias) {
                alert('Por favor, ingresa el alias que deseas.');
                return;
            }
            if (!forward) {
                alert('Por favor, ingresa la dirección de correo personal a direccionar.');
                return;
            }

            // Clean alias (remove @thehashcode.org if they manually wrote it)
            const cleanAlias = alias.replace('@thehashcode.org', '').trim();
            const aliasRegex = /^[a-z0-9._-]+$/;
            if (!aliasRegex.test(cleanAlias)) {
                alert('El alias solicitado solo puede contener letras, números, puntos, guiones y guiones bajos (sin arrobas, espacios ni otros caracteres especiales).');
                return;
            }

            // Validate destination email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(forward)) {
                alert('Por favor, ingresa un correo de destino válido.');
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

            const record = {
                requested_alias: cleanAlias,
                forward_to: forward,
                status: 'pendiente'
            };

            if (state.isSupabaseReal) {
                try {
                    const { error } = await supabase
                        .from('thc_email_requests')
                        .insert([record]);
                    if (error) throw error;
                } catch (err) {
                    console.error('Failed to save email request to Supabase:', err);
                    alert('Error de conexión al registrar en Supabase. Se enviará únicamente por correo.');
                }
            } else {
                // Local fallback
                const local = JSON.parse(localStorage.getItem('thc_email_requests_local') || '[]');
                local.push({ id: Date.now(), created_at: new Date().toISOString(), ...record });
                localStorage.setItem('thc_email_requests_local', JSON.stringify(local));
            }

            playChimeSound();

            // Prepare mailto composition
            const adminEmail = 'didac@thehashcode.org';
            const subject = encodeURIComponent('[THC Labs] Solicitud de Alias de Correo @thehashcode.org');
            const body = encodeURIComponent(
                `Hola Dídac,\n\n` +
                `Quiero solicitar la creación de un alias de correo electrónico redireccionado:\n` +
                `Alias solicitado: ${cleanAlias}@thehashcode.org\n` +
                `Redireccionar a mi correo personal: ${forward}\n\n` +
                `Quedo a la espera de la confirmación y el correo automático de verificación para activarlo.\n\n` +
                `¡Muchas gracias!`
            );

            // Open mail client
            window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;

            // Success Alert popup
            setTimeout(() => {
                alert(
                    `¡Solicitud registrada!\n\n` +
                    `Se ha guardado tu solicitud para crear el alias "${cleanAlias}@thehashcode.org" apuntando a "${forward}".\n\n` +
                    `IMPORTANTE: Recuerda que es muy probable que tengas que activar tu dirección una vez configurado el alias mediante un enlace de verificación automático que recibirás en tu buzón de correo.`
                );
                
                // Clear fields
                aliasInput.value = '';
                forwardInput.value = '';
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Solicitud y Notificar 🔥';
            }, 1000);
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
