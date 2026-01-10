// ============================================
// ZETA POS v3.0 - REAL-TIME SYNC EDITION
// ============================================

// ===== CONFIGURASI =====
const CONFIG = {
    APPS_SCRIPT_URL: localStorage.getItem('zeta_script_url') || '',
    SYNC_INTERVAL: 30000, // 30 detik
    MAX_RETRIES: 3,
    VERSION: '3.0' 
};

// ===== STATE =====
let state = {
    orderItems: [],
    pendingSync: [],
    isOnline: false,
    lastSync: null,
    syncQueue: [],
    realTimeData: null
};

// ===== WEBSOCKET SIMULATION (Polling) =====
class RealTimeSync {
    constructor() {
        this.interval = null;
        this.listeners = [];
        this.isRunning = false;
    }
    
    start() {
        if (this.isRunning) return;
        
        console.log("🔄 Starting real-time sync...");
        this.isRunning = true;
        
        // Sync setiap 30 detik
        this.interval = setInterval(() => {
            this.syncData();
            this.checkConnection();
        }, CONFIG.SYNC_INTERVAL);
        
        // Immediate first sync
        setTimeout(() => this.syncData(), 1000);
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log("⏹️ Real-time sync stopped");
    }
    
    async syncData() {
        if (!CONFIG.APPS_SCRIPT_URL) return;
        
        try {
            // 1. Sync pending transactions
            await this.syncPendingTransactions();
            
            // 2. Get latest data
            await this.fetchLatestData();
            
            // 3. Update UI
            this.notifyListeners();
            
            state.lastSync = new Date();
            updateSyncStatus(true);
            
        } catch (error) {
            console.error("❌ Sync error:", error);
            updateSyncStatus(false);
        }
    }
    
    async syncPendingTransactions() {
        if (state.syncQueue.length === 0) return;
        
        console.log(`📤 Syncing ${state.syncQueue.length} pending transactions...`);
        
        for (let i = 0; i < state.syncQueue.length; i++) {
            const transaction = state.syncQueue[i];
            
            try {
                const success = await this.sendTransaction(transaction);
                
                if (success) {
                    // Remove from queue
                    state.syncQueue.splice(i, 1);
                    i--;
                    
                    // Save to local history
                    saveToHistory(transaction, 'synced');
                    
                    console.log("✅ Transaction synced:", transaction.transaction_id);
                }
            } catch (error) {
                console.error("❌ Failed to sync transaction:", error);
                transaction.retries = (transaction.retries || 0) + 1;
                
                // Remove if too many retries
                if (transaction.retries >= CONFIG.MAX_RETRIES) {
                    state.syncQueue.splice(i, 1);
                    i--;
                    saveToHistory(transaction, 'failed');
                    console.log("🗑️ Transaction moved to history after max retries");
                }
            }
        }
        
        // Update queue display
        updateQueueDisplay();
    }
    
    async sendTransaction(transaction) {
        // Generate unique ID jika belum ada
        if (!transaction.transaction_id) {
            transaction.transaction_id = 'T' + Date.now() + Math.random().toString(36).substr(2, 9);
        }
        
        // Add timestamp
        transaction.timestamp = new Date().toISOString();
        
        // Try multiple methods
        const methods = [
            this.sendViaPost,
            this.sendViaGet,
            this.sendViaForm
        ];
        
        for (const method of methods) {
            try {
                const result = await method.call(this, transaction);
                if (result) return true;
            } catch (error) {
                console.log(`⚠️ Method failed, trying next...`);
            }
        }
        
        throw new Error("All methods failed");
    }
    
    async sendViaPost(transaction) {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
            mode: 'cors'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        return result.status === 'success';
    }
    
    async sendViaGet(transaction) {
        const encoded = encodeURIComponent(JSON.stringify(transaction));
        const url = `${CONFIG.APPS_SCRIPT_URL}?json=${encoded}&t=${Date.now()}`;
        
        const response = await fetch(url);
        const result = await response.json();
        return result.status === 'success';
    }
    
    async sendViaForm(transaction) {
        const formData = new FormData();
        formData.append('json', JSON.stringify(transaction));
        
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        return result.status === 'success';
    }
    
    async fetchLatestData() {
        if (!CONFIG.APPS_SCRIPT_URL) return;
        
        try {
            const url = `${CONFIG.APPS_SCRIPT_URL}?action=recent&t=${Date.now()}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.recent_transactions) {
                state.realTimeData = data.recent_transactions;
                updateRealTimeDisplay();
            }
            
            // Update stats
            if (data.stats) {
                updateStatsDisplay(data.stats);
            }
            
        } catch (error) {
            console.error("❌ Failed to fetch latest data:", error);
        }
    }
    
    async checkConnection() {
        if (!CONFIG.APPS_SCRIPT_URL) {
            state.isOnline = false;
            return;
        }
        
        try {
            const url = `${CONFIG.APPS_SCRIPT_URL}?action=ping&t=${Date.now()}`;
            const response = await fetch(url, { timeout: 5000 });
            const data = await response.json();
            
            state.isOnline = data.status === 'alive';
            updateConnectionStatus(state.isOnline);
            
        } catch (error) {
            state.isOnline = false;
            updateConnectionStatus(false);
        }
    }
    
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error("Listener error:", error);
            }
        });
    }
}

// ===== INITIALIZATION =====
let realTimeSync;

document.addEventListener('DOMContentLoaded', function() {
    initialize();
    setupEventListeners();
    loadConfig();
    startRealTimeSync();
    
    console.log("🚀 ZETA POS v3.0 initialized");
    addLog("Sistem real-time ready", "success");
});

function initialize() {
    // Load state from localStorage
    const savedState = localStorage.getItem('zeta_pos_state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            state.orderItems = parsed.orderItems || [];
            state.syncQueue = parsed.syncQueue || [];
        } catch (e) {
            console.error("Error loading state:", e);
        }
    }
    
    // Initialize real-time sync
    realTimeSync = new RealTimeSync();
    realTimeSync.addListener(onStateUpdate);
    
    // Update UI
    updateOrderDisplay();
    updateQueueDisplay();
}

function setupEventListeners() {
    // Menu buttons
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-add')) return;
            
            const id = this.dataset.id;
            const name = this.querySelector('h3').textContent;
            const price = parseInt(this.dataset.price);
            
            addToOrder({ id, name, price, quantity: 1 });
        });
    });
    
    // Add buttons
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.menu-card');
            const id = card.dataset.id;
            const name = card.querySelector('h3').textContent;
            const price = parseInt(card.dataset.price);
            
            addToOrder({ id, name, price, quantity: 1 });
        });
    });
    
    // Quantity controls
    document.getElementById('qty-minus').addEventListener('click', () => updateQuantity(-1));
    document.getElementById('qty-plus').addEventListener('click', () => updateQuantity(1));
    document.getElementById('qty-input').addEventListener('change', updateQtyInput);
    
    // Payment
    document.getElementById('btn-calculate').addEventListener('click', calculatePayment);
    document.getElementById('cash-input').addEventListener('input', validateCash);
    document.getElementById('btn-process').addEventListener('click', processPayment);
    
    // Reset
    document.getElementById('btn-reset').addEventListener('click', resetOrder);
    
    // Sync controls
    document.getElementById('btn-sync-now').addEventListener('click', () => realTimeSync.syncData());
    document.getElementById('btn-view-dashboard').addEventListener('click', openDashboard);
    
    // Config
    document.getElementById('btn-config').addEventListener('click', openConfig);
    document.getElementById('btn-save-config').addEventListener('click', saveConfig);
    document.getElementById('btn-test-config').addEventListener('click', testConfig);
}

function loadConfig() {
    const url = localStorage.getItem('zeta_script_url');
    const sheetId = localStorage.getItem('zeta_sheet_id');
    
    if (url) {
        CONFIG.APPS_SCRIPT_URL = url;
        document.getElementById('config-url').value = url;
    }
    
    if (sheetId) {
        document.getElementById('config-sheet-id').value = sheetId;
    }
}

function startRealTimeSync() {
    if (CONFIG.APPS_SCRIPT_URL) {
        realTimeSync.start();
        updateConnectionStatus(true);
    } else {
        updateConnectionStatus(false);
        addLog("⚠️ URL Apps Script belum dikonfigurasi", "warning");
    }
}

// ===== ORDER MANAGEMENT =====
function addToOrder(item) {
    // Check if already exists
    const existingIndex = state.orderItems.findIndex(i => i.id === item.id);
    
    if (existingIndex > -1) {
        state.orderItems[existingIndex].quantity += item.quantity;
    } else {
        state.orderItems.push({ ...item });
    }
    
    updateOrderDisplay();
    saveState();
    addLog(`+ ${item.name} ditambahkan`, "info");
}

function updateQuantity(change) {
    const input = document.getElementById('qty-input');
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(99, value + change));
    input.value = value;
}

function updateQtyInput() {
    const input = document.getElementById('qty-input');
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(99, value));
    input.value = value;
}

function updateOrderDisplay() {
    const container = document.getElementById('order-items');
    const totalElement = document.getElementById('order-total');
    
    if (state.orderItems.length === 0) {
        container.innerHTML = `
            <div class="empty-order">
                <i class="fas fa-shopping-cart"></i>
                <p>Belum ada pesanan</p>
            </div>
        `;
        totalElement.textContent = 'Rp0';
        return;
    }
    
    let html = '';
    let total = 0;
    
    state.orderItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        
        html += `
            <div class="order-item" data-index="${index}">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">${formatRupiah(item.price)}</div>
                </div>
                <div class="item-controls">
                    <button class="btn-qty minus" onclick="adjustQuantity(${index}, -1)">-</button>
                    <span class="item-quantity">${item.quantity}</span>
                    <button class="btn-qty plus" onclick="adjustQuantity(${index}, 1)">+</button>
                    <span class="item-subtotal">${formatRupiah(subtotal)}</span>
                    <button class="btn-remove" onclick="removeItem(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    totalElement.textContent = formatRupiah(total);
}

function adjustQuantity(index, change) {
    if (state.orderItems[index]) {
        state.orderItems[index].quantity = Math.max(1, state.orderItems[index].quantity + change);
        updateOrderDisplay();
        saveState();
    }
}

function removeItem(index) {
    if (state.orderItems[index]) {
        const removed = state.orderItems.splice(index, 1)[0];
        updateOrderDisplay();
        saveState();
        addLog(`- ${removed.name} dihapus`, "warning");
    }
}

function resetOrder() {
    if (state.orderItems.length === 0) return;
    
    if (confirm('Reset semua pesanan?')) {
        state.orderItems = [];
        updateOrderDisplay();
        saveState();
        addLog("Semua pesanan direset", "warning");
    }
}

// ===== PAYMENT PROCESSING =====
function calculatePayment() {
    const total = state.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cashInput = document.getElementById('cash-input');
    const cash = parseInt(cashInput.value) || 0;
    const changeElement = document.getElementById('change-amount');
    
    if (cash === 0) {
        showAlert('Masukkan jumlah uang!', 'error');
        return;
    }
    
    if (cash < total) {
        const kurang = total - cash;
        showAlert(`Uang kurang Rp${formatNumber(kurang)}!`, 'error');
        changeElement.textContent = 'Rp0';
        return;
    }
    
    const change = cash - total;
    changeElement.textContent = formatRupiah(change);
    showAlert('Pembayaran valid. Klik PROSES.', 'success');
}

function validateCash() {
    const total = state.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cash = parseInt(document.getElementById('cash-input').value) || 0;
    const processBtn = document.getElementById('btn-process');
    
    processBtn.disabled = cash < total || total === 0;
}

async function processPayment() {
    const total = state.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cash = parseInt(document.getElementById('cash-input').value) || 0;
    
    if (cash < total || state.orderItems.length === 0) {
        showAlert('Pembayaran tidak valid!', 'error');
        return;
    }
    
    // Prepare transaction
    const transaction = {
        transaction_id: 'T' + Date.now(),
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID'),
        items: state.orderItems,
        total: total,
        cash: cash,
        change: cash - total,
        status: 'pending_sync'
    };
    
    // Add to sync queue
    state.syncQueue.push(transaction);
    
    // Show processing
    showProcessing(true);
    
    // Try immediate sync
    try {
        const success = await realTimeSync.sendTransaction(transaction);
        
        if (success) {
            // Remove from queue if successful
            const index = state.syncQueue.findIndex(t => t.transaction_id === transaction.transaction_id);
            if (index > -1) state.syncQueue.splice(index, 1);
            
            showAlert('✅ Transaksi berhasil disimpan ke Google Sheets!', 'success');
            saveToHistory(transaction, 'synced_immediately');
        } else {
            showAlert('⚠️ Transaksi disimpan lokal, akan disync otomatis', 'warning');
            saveToHistory(transaction, 'queued');
        }
    } catch (error) {
        showAlert('⚠️ Transaksi disimpan lokal, akan disync otomatis', 'warning');
        saveToHistory(transaction, 'queued');
    }
    
    // Reset for next transaction
    setTimeout(() => {
        state.orderItems = [];
        document.getElementById('cash-input').value = '';
        document.getElementById('change-amount').textContent = 'Rp0';
        
        updateOrderDisplay();
        updateQueueDisplay();
        showProcessing(false);
        
        // Trigger sync
        realTimeSync.syncData();
        
    }, 2000);
}

// ===== REAL-TIME DISPLAY =====
function updateRealTimeDisplay() {
    if (!state.realTimeData) return;
    
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    
    let html = '';
    
    state.realTimeData.slice(0, 5).forEach(transaction => {
        html += `
            <div class="recent-transaction">
                <div class="recent-time">${transaction.time}</div>
                <div class="recent-amount">${formatRupiah(transaction.total)}</div>
                <div class="recent-id">${transaction.transaction_id}</div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="no-data">Belum ada transaksi</div>';
}

function updateStatsDisplay(stats) {
    const container = document.getElementById('stats-display');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Total Transaksi</div>
            <div class="stat-value">${stats.total_rows || 0}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Terakhir Update</div>
            <div class="stat-value">${stats.last_update || '-'}</div>
        </div>
    `;
}

function updateQueueDisplay() {
    const container = document.getElementById('sync-queue');
    if (!container) return;
    
    if (state.syncQueue.length === 0) {
        container.innerHTML = '<div class="empty-queue">Tidak ada transaksi pending</div>';
        return;
    }
    
    let html = `<div class="queue-header">${state.syncQueue.length} transaksi pending</div>`;
    
    state.syncQueue.slice(0, 3).forEach(transaction => {
        html += `
            <div class="queue-item">
                <div class="queue-id">${transaction.transaction_id}</div>
                <div class="queue-amount">${formatRupiah(transaction.total)}</div>
            </div>
        `;
    });
    
    if (state.syncQueue.length > 3) {
        html += `<div class="queue-more">+${state.syncQueue.length - 3} lainnya...</div>`;
    }
    
    container.innerHTML = html;
}

// ===== UTILITIES =====
function updateConnectionStatus(online) {
    const statusElement = document.getElementById('connection-status');
    const syncBtn = document.getElementById('btn-sync-now');
    
    if (online) {
        statusElement.className = 'status online';
        statusElement.innerHTML = '<i class="fas fa-wifi"></i> ONLINE';
        syncBtn.disabled = false;
    } else {
        statusElement.className = 'status offline';
        statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> OFFLINE';
        syncBtn.disabled = true;
    }
}

function updateSyncStatus(success) {
    const syncElement = document.getElementById('last-sync');
    const now = new Date();
    
    syncElement.textContent = success 
        ? `Terakhir sync: ${now.toLocaleTimeString('id-ID')}`
        : `Sync gagal: ${now.toLocaleTimeString('id-ID')}`;
    
    syncElement.className = success ? 'sync-success' : 'sync-failed';
}

function addLog(message, type = 'info') {
    const logContainer = document.getElementById('activity-log');
    if (!logContainer) return;
    
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${message}</span>
    `;
    
    logContainer.prepend(logEntry);
    
    // Keep only last 10 logs
    const logs = logContainer.querySelectorAll('.log-entry');
    if (logs.length > 10) {
        for (let i = 10; i < logs.length; i++) {
            logs[i].remove();
        }
    }
}

function showAlert(message, type) {
    const alertDiv = document.getElementById('alert-message');
    alertDiv.textContent = message;
    alertDiv.className = `alert ${type}`;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 3000);
}

function showProcessing(show) {
    const overlay = document.getElementById('processing-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function saveState() {
    try {
        localStorage.setItem('zeta_pos_state', JSON.stringify({
            orderItems: state.orderItems,
            syncQueue: state.syncQueue
        }));
    } catch (e) {
        console.error("Error saving state:", e);
    }
}

function saveToHistory(transaction, status) {
    try {
        const history = JSON.parse(localStorage.getItem('zeta_history') || '[]');
        history.push({
            ...transaction,
            saved_at: new Date().toISOString(),
            save_status: status
        });
        
        // Keep only last 100
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
        
        localStorage.setItem('zeta_history', JSON.stringify(history));
    } catch (e) {
        console.error("Error saving to history:", e);
    }
}

function formatRupiah(amount) {
    return 'Rp' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ===== CONFIGURATION =====
function openConfig() {
    document.getElementById('config-modal').style.display = 'flex';
}

function closeConfig() {
    document.getElementById('config-modal').style.display = 'none';
}

async function testConfig() {
    const url = document.getElementById('config-url').value.trim();
    
    if (!url) {
        showAlert('Masukkan URL terlebih dahulu!', 'error');
        return;
    }
    
    showProcessing(true);
    
    try {
        const testUrl = `${url}?action=ping&t=${Date.now()}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (data.status === 'alive') {
            showAlert('✅ Koneksi berhasil!', 'success');
        } else {
            showAlert('❌ Koneksi gagal!', 'error');
        }
    } catch (error) {
        showAlert('❌ Koneksi gagal! Periksa URL dan koneksi internet.', 'error');
    } finally {
        showProcessing(false);
    }
}

function saveConfig() {
    const url = document.getElementById('config-url').value.trim();
    const sheetId = document.getElementById('config-sheet-id').value.trim();
    
    if (!url) {
        showAlert('URL Apps Script wajib diisi!', 'error');
        return;
    }
    
    // Save to config
    CONFIG.APPS_SCRIPT_URL = url;
    localStorage.setItem('zeta_script_url', url);
    localStorage.setItem('zeta_sheet_id', sheetId);
    
    // Restart sync
    realTimeSync.stop();
    startRealTimeSync();
    
    closeConfig();
    showAlert('✅ Konfigurasi disimpan!', 'success');
}

function openDashboard() {
    window.open('admin.html', '_blank');
}

// ===== GLOBAL FUNCTIONS =====
window.adjustQuantity = adjustQuantity;
window.removeItem = removeItem;
window.openConfig = openConfig;
window.closeConfig = closeConfig;
window.testConfig = testConfig;
window.saveConfig = saveConfig;

// State update listener
function onStateUpdate(newState) {
    // Update display based on state changes
    updateQueueDisplay();
    updateRealTimeDisplay();
}
async function saveToGoogleSheets(transactionData) {
    console.log("📤 Attempting to save to Google Sheets...");
    
    if (!CONFIG.APPS_SCRIPT_URL) {
        console.error("❌ No Apps Script URL configured");
        return false;
    }
    
    // Ensure data has required fields
    const dataToSend = {
        ...transactionData,
        timestamp: new Date().toISOString(),
        transaction_id: transactionData.transaction_id || 'T' + Date.now() + Math.random().toString(36).substr(2, 9)
    };
    
    console.log("📦 Data to send:", dataToSend);
    
};