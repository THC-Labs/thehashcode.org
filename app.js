// THC Labs Hub - Core Logic

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
            '#ef4444', '#3b82f6', '#ffffff', '#000000'  // System
        ],
        selectedPixelColor: '#70e000',
        activeTool: 'draw', // 'draw' or 'erase'
        showPixelGrid: true,
        canvasPixels: [], // 32x32 color grid
        onlineFriends: [
            { id: 1, name: 'SlayerCode', status: 'online', game: 'Valorant', avatar: '#38b000' },
            { id: 2, name: 'WeedWizard', status: 'idle', game: 'Minecraft', avatar: '#d4a373' },
            { id: 3, name: 'HexGamer', status: 'online', game: 'Counter-Strike 2', avatar: '#b07d4f' },
            { id: 4, name: 'NikoBellic', status: 'dnd', game: 'GTA V', avatar: '#ef4444' },
            { id: 5, name: 'MarihuanaMix', status: 'online', game: 'Spotify', avatar: '#70e000' }
        ],
        vcUsers: ['SlayerCode', 'HexGamer']
    };

    // --- DOM ELEMENTS ---
    const digitalClock = document.getElementById('digital-clock');
    const appsContainer = document.getElementById('apps-container');
    const discordUsers = document.getElementById('discord-users');
    const vcUsersList = document.getElementById('vc-users-list');
    const onlineCounter = document.getElementById('online-counter');
    
    // Pixel Canvas Elements
    const pixelCanvas = document.getElementById('pixel-canvas');
    const ctx = pixelCanvas.getContext('2d');
    const pixelColorsPalette = document.getElementById('pixel-colors');
    const customColorInput = document.getElementById('custom-color');
    const toolDrawBtn = document.getElementById('tool-draw');
    const toolEraseBtn = document.getElementById('tool-erase');
    const toolGridToggleBtn = document.getElementById('tool-grid-toggle');
    const btnClearCanvas = document.getElementById('btn-clear-canvas');
    const btnDownloadCanvas = document.getElementById('btn-download-canvas');
    const syncSimulatorToggle = document.getElementById('sync-simulator-toggle');
    const liveUsersDrawing = document.getElementById('live-users-drawing');

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

    // --- INITIALIZATION ---
    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        loadStorageData();
        renderApps();
        renderEvents();
        renderDiscordStatus();
        renderChatProfileSelector();
        renderChat();
        
        initPixelCanvas();
        setupEventListeners();
        simulateRealtimeActivities();
    }

    // --- DIGITAL CLOCK ---
    function updateClock() {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        digitalClock.textContent = timeStr;
    }

    // --- LOCAL STORAGE DATA LOADER ---
    function loadStorageData() {
        // Load Apps
        const storedApps = localStorage.getItem('thc_apps');
        if (storedApps) {
            state.apps = JSON.parse(storedApps);
        } else {
            // Default Apps
            state.apps = [
                { id: 1, name: 'Plex Media', url: 'https://plex.thehashcode.org', desc: 'Servidor de películas, series y streaming para el grupo.', icon: 'fa-film', color: 'brown' },
                { id: 2, name: 'Game Stats', url: 'https://stats.thehashcode.org', desc: 'Estadísticas acumuladas de nuestras partidas en CS2, Valorant y Lol.', icon: 'fa-chart-simple', color: 'green' },
                { id: 3, name: 'Minecraft Server', url: 'https://mc.thehashcode.org', desc: 'Estado del servidor de Minecraft Survival Técnico.', icon: 'fa-gamepad', color: 'gold' },
                { id: 4, name: 'Admin Console', url: 'https://cloud.thehashcode.org', desc: 'Acceso a archivos compartidos, base de datos y despliegues.', icon: 'fa-terminal', color: 'green' }
            ];
            localStorage.setItem('thc_apps', JSON.stringify(state.apps));
        }

        // Load Events
        const storedEvents = localStorage.getItem('thc_events');
        if (storedEvents) {
            state.events = JSON.parse(storedEvents);
        } else {
            // Default Events
            state.events = [
                { id: 1, title: 'Noche de Minecraft Técnico', date: new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 16), platform: 'Discord (Sala General)', desc: 'Reunión para planificar la granja de oro masiva y repartir recursos.' },
                { id: 2, title: 'Torneo de 1v1 CS2', date: new Date(Date.now() + 86400000 * 5).toISOString().substring(0, 16), platform: 'Servidor de Práctica THC', desc: 'Premio para el ganador: Rango especial y un Kebab pagado por el clan.' }
            ];
            localStorage.setItem('thc_events', JSON.stringify(state.events));
        }

        // Load Chat Profile
        const storedProfile = localStorage.getItem('thc_chat_profile');
        if (storedProfile) {
            state.chatProfile = JSON.parse(storedProfile);
        }

        // Load Chat Messages
        const storedChat = localStorage.getItem('thc_chat_messages');
        if (storedChat) {
            state.chatMessages = JSON.parse(storedChat);
        } else {
            state.chatMessages = [
                { user: 'SlayerCode', color: '#ffb703', msg: 'ey chavales, esta tarde echamos unas partidas no?', time: '20:30' },
                { user: 'WeedWizard', color: '#38b000', msg: 'de una, yo me meto al Minecraft en un rato a picar', time: '20:32' },
                { user: 'HexGamer', color: '#b07d4f', msg: 'Yo a las 21:00 estoy listo para el CS2, montamos lobby de 5', time: '20:33' }
            ];
            localStorage.setItem('thc_chat_messages', JSON.stringify(state.chatMessages));
        }

        // Load Pixel Canvas state
        const storedCanvas = localStorage.getItem('thc_pixel_canvas');
        if (storedCanvas) {
            state.canvasPixels = JSON.parse(storedCanvas);
        } else {
            // Initialize 32x32 grid with transparent/black color (#000000)
            state.canvasPixels = new Array(32 * 32).fill('#000000');
            localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
        }
    }

    // --- RENDER DYNAMIC SUBDOMAINS/APPS ---
    function renderApps() {
        appsContainer.innerHTML = '';
        state.apps.forEach(app => {
            const card = document.createElement('a');
            card.href = app.url;
            card.target = '_blank';
            card.className = `app-card card-${app.color}`;
            
            // Check if app is custom to add a delete button
            const isDefault = app.id === 1 || app.id === 2 || app.id === 3 || app.id === 4;
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
                <span class="app-domain"><i class="fa-solid fa-link"></i> ${app.url.replace('https://', '')}</span>
            `;

            // Prevent event bubbling on delete button click
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

    // --- RENDER EVENTS CALENDAR ---
    function renderEvents() {
        eventsContainer.innerHTML = '';
        if (state.events.length === 0) {
            eventsContainer.innerHTML = `<div class="event-card" style="border-left-color: var(--text-muted); text-align: center;"><p style="font-size: 0.8rem; color: var(--text-muted);">No hay eventos programados.</p></div>`;
            return;
        }

        // Sort events by date
        const sortedEvents = [...state.events].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedEvents.forEach(event => {
            const dateObj = new Date(event.date);
            const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <button class="event-delete-btn" data-id="${event.id}"><i class="fa-solid fa-trash-can"></i></button>
                <div class="event-card-header">
                    <h4>${event.title}</h4>
                    <span class="event-date-badge"><i class="fa-regular fa-clock"></i> ${formattedDate}</span>
                </div>
                <p class="event-meta">${event.desc}</p>
                <span class="event-platform-tag"><i class="fa-solid fa-location-dot"></i> ${event.platform}</span>
            `;

            const deleteBtn = card.querySelector('.event-delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteEvent(event.id);
            });

            eventsContainer.appendChild(card);
        });
    }

    function deleteEvent(id) {
        state.events = state.events.filter(e => e.id !== id);
        localStorage.setItem('thc_events', JSON.stringify(state.events));
        renderEvents();
    }

    // --- RENDER DISCORD / ONLINE WIDGET ---
    function renderDiscordStatus() {
        discordUsers.innerHTML = '';
        state.onlineFriends.forEach(user => {
            const item = document.createElement('li');
            item.className = 'discord-user-card';
            
            let statusClass = 'online';
            if (user.status === 'idle') statusClass = 'idle';
            if (user.status === 'dnd') statusClass = 'dnd';

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
            discordUsers.appendChild(item);
        });

        // Set online counter text
        const onlineCount = state.onlineFriends.filter(f => f.status !== 'offline').length;
        onlineCounter.textContent = `${onlineCount} online`;

        // Render Voice Chat participants
        vcUsersList.innerHTML = '';
        state.vcUsers.forEach(username => {
            const user = state.onlineFriends.find(f => f.name === username);
            const color = user ? user.avatar : '#888';
            const tag = document.createElement('div');
            tag.className = 'vc-user-tag';
            tag.innerHTML = `
                <i class="fa-solid fa-microphone"></i>
                <span style="font-weight: 500;">${username}</span>
            `;
            vcUsersList.appendChild(tag);
        });
    }

    // --- COMMUNITY CHAT SYSTEM ---
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

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const newMsg = {
            user: state.chatProfile.username,
            color: state.chatProfile.color,
            msg: text,
            time: time
        };

        state.chatMessages.push(newMsg);
        // Limit chat to last 40 messages
        if (state.chatMessages.length > 40) {
            state.chatMessages.shift();
        }
        localStorage.setItem('thc_chat_messages', JSON.stringify(state.chatMessages));
        renderChat();
        chatInput.value = '';

        // Trigger bot / dynamic simulated response
        if (Math.random() > 0.3) {
            setTimeout(simulateFriendResponse, 1500 + Math.random() * 2000);
        }
    }

    function simulateFriendResponse() {
        const friendsWhoCanReply = state.onlineFriends.filter(f => f.status === 'online');
        if (friendsWhoCanReply.length === 0) return;
        const randomFriend = friendsWhoCanReply[Math.floor(Math.random() * friendsWhoCanReply.length)];

        const responses = [
            "jajajaja brutal",
            "yo me meto en 5 minutos",
            "quién está online en discord?",
            "pasa link",
            "lolazo",
            "esta noche sale party",
            "hecho",
            "vaya viciada colega",
            "esperadme que estoy cenando",
            "alguien para valorant hoy?",
            "siiiii",
            "buaa increíble"
        ];

        const text = responses[Math.floor(Math.random() * responses.length)];
        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const botMsg = {
            user: randomFriend.name,
            color: randomFriend.avatar,
            msg: text,
            time: time
        };

        state.chatMessages.push(botMsg);
        localStorage.setItem('thc_chat_messages', JSON.stringify(state.chatMessages));
        renderChat();
    }

    // --- INTERACTIVE PIXEL ART BOARD ---
    const logicalGridSize = 32; // 32x32 cells
    let canvasRect = null;
    let isDrawing = false;

    function initPixelCanvas() {
        // Build palette indicators
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

        // Add support for custom color changes
        customColorInput.addEventListener('input', (e) => {
            state.selectedPixelColor = e.target.value;
            document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
            state.activeTool = 'draw';
            updateToolButtons();
        });

        // Initialize size adjustments
        drawPixelBoard();
    }

    function drawPixelBoard() {
        const width = pixelCanvas.width;
        const height = pixelCanvas.height;
        const cellSize = width / logicalGridSize; // 512 / 32 = 16px

        // Clear canvas
        ctx.fillStyle = '#020402';
        ctx.fillRect(0, 0, width, height);

        // Draw Pixels
        for (let y = 0; y < logicalGridSize; y++) {
            for (let x = 0; x < logicalGridSize; x++) {
                const index = y * logicalGridSize + x;
                const color = state.canvasPixels[index];
                if (color && color !== '#000000') {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        // Draw Grid Lines if active
        if (state.showPixelGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 0.5;
            
            for (let i = 0; i <= logicalGridSize; i++) {
                // Vertical lines
                ctx.beginPath();
                ctx.moveTo(i * cellSize, 0);
                ctx.lineTo(i * cellSize, height);
                ctx.stroke();

                // Horizontal lines
                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(width, i * cellSize);
                ctx.stroke();
            }
        }
    }

    function paintPixelAtCoordinates(x, y) {
        canvasRect = pixelCanvas.getBoundingClientRect();
        
        // Calculate logical x, y positions (0 to 31)
        const scaleX = pixelCanvas.width / canvasRect.width;
        const scaleY = pixelCanvas.height / canvasRect.height;
        
        const canvasX = (x - canvasRect.left) * scaleX;
        const canvasY = (y - canvasRect.top) * scaleY;
        
        const cellX = Math.floor(canvasX / (pixelCanvas.width / logicalGridSize));
        const cellY = Math.floor(canvasY / (pixelCanvas.height / logicalGridSize));

        // Boundary checks
        if (cellX >= 0 && cellX < logicalGridSize && cellY >= 0 && cellY < logicalGridSize) {
            const index = cellY * logicalGridSize + cellX;
            const drawColor = state.activeTool === 'draw' ? state.selectedPixelColor : '#000000';
            
            if (state.canvasPixels[index] !== drawColor) {
                state.canvasPixels[index] = drawColor;
                localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
                drawPixelBoard();
            }
        }
    }

    function updateToolButtons() {
        toolDrawBtn.classList.toggle('active', state.activeTool === 'draw');
        toolEraseBtn.classList.toggle('active', state.activeTool === 'erase');
    }

    // --- EVENT LISTENERS REGISTRATION ---
    function setupEventListeners() {
        // App Modal Triggers
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

            // Clear inputs & close modal
            document.getElementById('app-name').value = '';
            document.getElementById('app-url').value = '';
            document.getElementById('app-desc').value = '';
            modalApp.classList.add('hidden');
        });

        // Event Modal Triggers
        btnAddEvent.addEventListener('click', () => {
            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(21, 0, 0, 0);
            document.getElementById('event-date').value = tomorrow.toISOString().substring(0, 16);
            modalEvent.classList.remove('hidden');
        });
        modalEventClose.addEventListener('click', () => modalEvent.classList.add('hidden'));
        btnCancelEvent.addEventListener('click', () => modalEvent.classList.add('hidden'));

        btnSaveEvent.addEventListener('click', () => {
            const title = document.getElementById('event-title').value.trim();
            const date = document.getElementById('event-date').value;
            const platform = document.getElementById('event-platform').value.trim();
            const desc = document.getElementById('event-desc').value.trim();

            if (!title || !date || !platform) {
                alert('Por favor, rellena los campos principales (Título, Fecha y Canal/Plataforma).');
                return;
            }

            const newEvent = {
                id: Date.now(),
                title: title,
                date: date,
                platform: platform,
                desc: desc || 'Sin detalles adicionales.'
            };

            state.events.push(newEvent);
            localStorage.setItem('thc_events', JSON.stringify(state.events));
            renderEvents();

            // Clear inputs & close
            document.getElementById('event-title').value = '';
            document.getElementById('event-desc').value = '';
            document.getElementById('event-platform').value = '';
            modalEvent.classList.add('hidden');
        });

        // Chat interactions
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

        btnSendMessage.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Pixel board drawing mouse handlers
        pixelCanvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            paintPixelAtCoordinates(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDrawing) {
                paintPixelAtCoordinates(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            isDrawing = false;
        });

        // Mobile touch support
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

        // Pixel actions
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
            if (confirm('¿Seguro que quieres borrar toda la pizarra de píxeles?')) {
                state.canvasPixels = new Array(32 * 32).fill('#000000');
                localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
                drawPixelBoard();
            }
        });

        btnDownloadCanvas.addEventListener('click', () => {
            // Generate PNG download with upscale to 512x512
            // Since we want to download without the grid lines, we draw it to a temporary upscaled canvas
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

    // --- SIMULATED LIVENESS / MULTIPLAYER AND DISCORD ---
    function simulateRealtimeActivities() {
        // 1. Simulates friends drawing random pixels
        setInterval(() => {
            if (!syncSimulatorToggle.checked) return;
            
            // 20% chance another user draws a pixel
            if (Math.random() < 0.25) {
                const randomCell = Math.floor(Math.random() * (logicalGridSize * logicalGridSize));
                const randomColor = state.pixelColors[Math.floor(Math.random() * (state.pixelColors.length - 2))]; // avoid pure black/white
                
                state.canvasPixels[randomCell] = randomColor;
                localStorage.setItem('thc_pixel_canvas', JSON.stringify(state.canvasPixels));
                
                // Temporarily flash drawing status
                const friendsNames = state.onlineFriends.map(f => f.name);
                const randomFriendName = friendsNames[Math.floor(Math.random() * friendsNames.length)];
                liveUsersDrawing.textContent = `${randomFriendName} dibujando...`;
                liveUsersDrawing.classList.add('text-green');
                
                drawPixelBoard();

                setTimeout(() => {
                    liveUsersDrawing.textContent = '2 dibujando';
                    liveUsersDrawing.classList.remove('text-green');
                }, 2000);
            }
        }, 6000);

        // 2. Simulates Discord game states updating
        setInterval(() => {
            if (Math.random() < 0.3) {
                // Change game of a random friend
                const friendIndex = Math.floor(Math.random() * state.onlineFriends.length);
                const games = ['Valorant', 'Minecraft', 'League of Legends', 'Counter-Strike 2', 'GTA V', 'Apex Legends', 'Among Us', 'Cyberpunk 2077', 'Spotify', 'Visual Studio Code'];
                const randomGame = games[Math.floor(Math.random() * games.length)];
                
                state.onlineFriends[friendIndex].game = randomGame;
                
                // Shuffle online statuses slightly
                const statuses = ['online', 'idle', 'dnd'];
                if (Math.random() < 0.2) {
                    state.onlineFriends[friendIndex].status = statuses[Math.floor(Math.random() * statuses.length)];
                }

                // Randomize voice channel people
                if (Math.random() < 0.15) {
                    const friendName = state.onlineFriends[friendIndex].name;
                    if (state.vcUsers.includes(friendName)) {
                        state.vcUsers = state.vcUsers.filter(u => u !== friendName);
                    } else {
                        state.vcUsers.push(friendName);
                    }
                }
                
                renderDiscordStatus();
            }
        }, 12000);
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

    // Launch application
    init();
});
