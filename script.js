// ============================================
// ZETA POS ULTRA - MAIN SCRIPT
// Elegant POS System with Google Sheets Integration
// ============================================

// App State
const AppState = {
    orderItems: [],
    selectedItemIndex: null,
    currentQuantity: 1,
    cashAmount: 0,
    isOnline: false,
    syncQueue: [],
    transactionHistory: [],
    config: {
        scriptUrl: localStorage.getItem('zeta_script_url') || '',
        spreadsheetId: localStorage.getItem('zeta_spreadsheet_id') || '',
        syncInterval: 30000,
        autoSync: true
    }
};

// DOM Elements
const Elements = {
    // Header
    connectionStatus: document.getElementById('connectionStatus'),
    currentTime: document.getElementById('currentTime'),
    currentDate: document.getElementById('currentDate'),
    
    // Menu
    menuCards: document.querySelectorAll('.menu-card'),
    btnMenuAdd: document.querySelectorAll('.btn-menu-add'),
    
    // Order
    orderList: document.getElementById('orderList'),
    orderCount: document.getElementById('orderCount'),
    subtotal: document.getElementById('subtotal'),
    itemCount: document.getElementById('itemCount'),
    totalAmount: document.getElementById('totalAmount'),
    btnClearOrder: document.getElementById('btnClearOrder'),
    
    // Quantity
    qtyInput: document.getElementById('qtyInput'),
    qtyDecrease: document.getElementById('qtyDecrease'),
    qtyIncrease: document.getElementById('qtyIncrease'),
    btnUpdateQty: document.getElementById('btnUpdateQty'),
    
    // Payment
    cashAmount: document.getElementById('cashAmount'),
    changeAmount: document.getElementById('changeAmount'),
    paymentStatus: document.getElementById('paymentStatus'),
    btnCalculate: document.getElementById('btnCalculate'),
    btnProcess: document.getElementById('btnProcess'),
    
    // Activity Log
    activityLog: document.getElementById('activityLog'),
    
    // Footer
    syncStatus: document.getElementById('syncStatus'),
    lastSync: document.getElementById('lastSync'),
    transactionCount: document.getElementById('transactionCount'),
    
    // Modals
    settingsModal: document.getElementById('settingsModal'),
    successModal: document.getElementById('successModal'),
    scriptUrl: document.getElementById('scriptUrl'),
    spreadsheetId: document.getElementById('spreadsheetId'),
    btnTestConnection: document.getElementById('btnTestConnection'),
    testResult: document.getElementById('testResult'),
    saveSettings: document.getElementById('saveSettings'),
    cancelSettings: document.getElementById('cancelSettings'),
    closeSettings: document.getElementById('closeSettings'),
    successTotal: document.getElementById('successTotal'),
    successCash: document.getElementById('successCash'),
    successChange: document.getElementById('successChange'),
    successId: document.getElementById('successId'),
    btnPrint: document.getElementById('btnPrint'),
    closeSuccess: document.getElementById('closeSuccess'),
    
    // Buttons
    btnDashboard: document.getElementById('btnDashboard'),
    btnSettings: document.getElementById('btnSettings'),
    btnHelp: document.getElementById('btnHelp'),
    btnQuickSale: document.getElementById('btnQuickSale'),
    
    // Loading
    loadingScreen: document.getElementById('loadingScreen'),
    mainContainer: document.getElementById('mainContainer')
};

// Menu Data
const MenuItems = {
    'nasi-dasar': {
        id: 'nasi-dasar',
        name: 'Nasi Daun Jeruk',
        description: 'Paket dasar dengan nasi wangi daun jeruk',
        price: 10000,
        icon: '🍚',
        category: 'nasi'
    },
    'paket-lengkap': {
        id: 'paket-lengkap',
        name: 'Paket Lengkap',
        description: 'Nasi + Ayam Suwir + Kulit Krispi',
        price: 12000,
        icon: '👑',
        category: 'nasi',
        savings: 3000
    },
    'ayam-suwir': {
        id: 'ayam-suwir',
        name: 'Ayam Suwir',
        description: 'Topping ayam suwir spesial',
        price: 0,
        icon: '🍗',
        category: 'topping'
    },
    'kulit-krispi': {
        id: 'kulit-krispi',
        name: 'Kulit Ayam Krispi',
        description: 'Kulit ayam krispi renyah',
        price: 0,
        icon: '🥓',
        category: 'topping'
    },
    'es-jeruk': {
        id: 'es-jeruk',
        name: 'Es Jeruk Peras',
        description: 'Jeruk peras asli dengan es batu',
        price: 5000,
        icon: '🧃',
        category: 'minuman'
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Show loading screen
    showLoading(true);
    
    // Initialize components
    initializeClock();
    initializeEventListeners();
    loadSavedData();
    
    // Test connection if configured
    if (AppState.config.scriptUrl) {
        await testConnection();
    }
    
    // Update UI
    updateUI();
    
    // Hide loading screen
    setTimeout(() => {
        showLoading(false);
        addActivityLog('Sistem siap digunakan', 'info');
    }, 1000);
}

function showLoading(show) {
    if (show) {
        Elements.loadingScreen.classList.remove('hidden');
        Elements.mainContainer.style.opacity = '0.5';
    } else {
        Elements.loadingScreen.classList.add('hidden');
        Elements.mainContainer.style.opacity = '1';
    }
}

function initializeClock() {
    function updateClock() {
        const now = new Date();
        
        // Update time
        const timeString = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        Elements.currentTime.textContent = timeString;
        
        // Update date
        const dateString = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        Elements.currentDate.textContent = dateString;
    }
    
    // Update immediately
    updateClock();
    
    // Update every second
    setInterval(updateClock, 1000);
}

function initializeEventListeners() {
    // Menu buttons
    Elements.menuCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-menu-add')) {
                const itemId = card.dataset.id;
                addOrderItem(itemId, AppState.currentQuantity);
            }
        });
    });
    
    // Add to order buttons
    Elements.btnMenuAdd.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.id;
            addOrderItem(itemId, AppState.currentQuantity);
        });
    });
    
    // Order management
    Elements.btnClearOrder.addEventListener('click', clearOrder);
    
    // Quantity controls
    Elements.qtyDecrease.addEventListener('click', () => updateQuantity(-1));
    Elements.qtyIncrease.addEventListener('click', () => updateQuantity(1));
    Elements.qtyInput.addEventListener('change', updateQtyFromInput);
    Elements.btnUpdateQty.addEventListener('click', updateSelectedQuantity);
    
    // Payment controls
    Elements.cashAmount.addEventListener('input', validatePayment);
    Elements.btnCalculate.addEventListener('click', calculateChange);
    Elements.btnProcess.addEventListener('click', processTransaction);
    
    // Modal controls
    Elements.btnSettings.addEventListener('click', () => showSettingsModal(true));
    Elements.closeSettings.addEventListener('click', () => showSettingsModal(false));
    Elements.cancelSettings.addEventListener('click', () => showSettingsModal(false));
    Elements.btnTestConnection.addEventListener('click', testConnection);
    Elements.saveSettings.addEventListener('click', saveSettings);
    Elements.closeSuccess.addEventListener('click', () => showSuccessModal(false));
    
    // Dashboard button
    Elements.btnDashboard.addEventListener('click', openDashboard);
    
    // Quick sale button
    Elements.btnQuickSale.addEventListener('click', quickSale);
    
    // Print receipt
    Elements.btnPrint.addEventListener('click', printReceipt);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // F2 for quick sale
        if (e.key === 'F2') {
            e.preventDefault();
            quickSale();
        }
        
        // ESC to close modals
        if (e.key === 'Escape') {
            showSettingsModal(false);
            showSuccessModal(false);
        }
        
        // F1 for settings
        if (e.key === 'F1') {
            e.preventDefault();
            showSettingsModal(true);
        }
        
        // Ctrl+S to save transaction
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (!Elements.btnProcess.disabled) {
                processTransaction();
            }
        }
    });
    
    // Close modal on background click
    Elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === Elements.settingsModal) {
            showSettingsModal(false);
        }
    });
    
    Elements.successModal.addEventListener('click', (e) => {
        if (e.target === Elements.successModal) {
            showSuccessModal(false);
        }
    });
}

function loadSavedData() {
    try {
        // Load transaction history
        const savedHistory = localStorage.getItem('zeta_transaction_history');
        if (savedHistory) {
            AppState.transactionHistory = JSON.parse(savedHistory);
            Elements.transactionCount.textContent = AppState.transactionHistory.length;
        }
        
        // Load sync queue
        const savedQueue = localStorage.getItem('zeta_sync_queue');
        if (savedQueue) {
            AppState.syncQueue = JSON.parse(savedQueue);
        }
        
    } catch (error) {
        console.error('Error loading saved data:', error);
        addActivityLog('Gagal memuat data lokal', 'error');
    }
}

// ===== ORDER MANAGEMENT =====

function addOrderItem(itemId, quantity = 1) {
    const menuItem = MenuItems[itemId];
    if (!menuItem) return;
    
    // Check if item already exists in order
    const existingIndex = AppState.orderItems.findIndex(item => item.id === itemId);
    
    if (existingIndex > -1) {
        // Update existing item
        AppState.orderItems[existingIndex].quantity += quantity;
        AppState.selectedItemIndex = existingIndex;
    } else {
        // Add new item
        const orderItem = {
            ...menuItem,
            quantity: quantity,
            addedAt: new Date().toISOString()
        };
        AppState.orderItems.push(orderItem);
        AppState.selectedItemIndex = AppState.orderItems.length - 1;
    }
    
    // Update quantity input
    Elements.qtyInput.value = AppState.orderItems[AppState.selectedItemIndex].quantity;
    AppState.currentQuantity = AppState.orderItems[AppState.selectedItemIndex].quantity;
    
    // Update UI
    updateOrderDisplay();
    updateOrderSummary();
    
    // Add to activity log
    addActivityLog(`Ditambahkan: ${menuItem.name} x${quantity}`, 'success');
    
    // Show notification
    showNotification(`${menuItem.name} ditambahkan ke pesanan`, 'success');
}

function updateOrderDisplay() {
    const orderList = Elements.orderList;
    
    if (AppState.orderItems.length === 0) {
        orderList.innerHTML = `
            <div class="empty-order">
                <div class="empty-icon">
                    <i class="fas fa-shopping-basket"></i>
                </div>
                <h3>Belum ada pesanan</h3>
                <p>Pilih menu dari panel kiri untuk memulai</p>
            </div>
        `;
        Elements.orderCount.textContent = '0 Item';
        return;
    }
    
    let html = '';
    let totalItems = 0;
    
    AppState.orderItems.forEach((item, index) => {
        totalItems += item.quantity;
        const itemTotal = item.price * item.quantity;
        const isSelected = index === AppState.selectedItemIndex;
        
        html += `
            <div class="order-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                        <span>${formatRupiah(item.price)}</span>
                        <span>•</span>
                        <span>${item.quantity} porsi</span>
                    </div>
                </div>
                <div class="item-controls">
                    <div class="qty-control">
                        <button class="qty-btn-sm decrease" onclick="adjustQuantity(${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn-sm increase" onclick="adjustQuantity(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <span class="item-price">${formatRupiah(itemTotal)}</span>
                    <button class="btn-remove-item" onclick="removeOrderItem(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    orderList.innerHTML = html;
    Elements.orderCount.textContent = `${totalItems} Item`;
    
    // Add click handlers for selection
    document.querySelectorAll('.order-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.qty-control') && !e.target.closest('.btn-remove-item')) {
                selectOrderItem(index);
            }
        });
    });
}

function selectOrderItem(index) {
    AppState.selectedItemIndex = index;
    const selectedItem = AppState.orderItems[index];
    
    if (selectedItem) {
        Elements.qtyInput.value = selectedItem.quantity;
        AppState.currentQuantity = selectedItem.quantity;
        updateOrderDisplay();
    }
}

window.adjustQuantity = function(index, change) {
    if (AppState.orderItems[index]) {
        const newQuantity = AppState.orderItems[index].quantity + change;
        if (newQuantity >= 1 && newQuantity <= 99) {
            AppState.orderItems[index].quantity = newQuantity;
            AppState.selectedItemIndex = index;
            Elements.qtyInput.value = newQuantity;
            AppState.currentQuantity = newQuantity;
            
            updateOrderDisplay();
            updateOrderSummary();
            addActivityLog(`Diupdate: ${AppState.orderItems[index].name} → ${newQuantity}pcs`, 'info');
        }
    }
};

window.removeOrderItem = function(index) {
    if (AppState.orderItems[index]) {
        const removedItem = AppState.orderItems.splice(index, 1)[0];
        
        if (AppState.selectedItemIndex === index) {
            AppState.selectedItemIndex = null;
        } else if (AppState.selectedItemIndex > index) {
            AppState.selectedItemIndex--;
        }
        
        updateOrderDisplay();
        updateOrderSummary();
        addActivityLog(`Dihapus: ${removedItem.name}`, 'warning');
        showNotification(`${removedItem.name} dihapus dari pesanan`, 'warning');
    }
};

function updateQuantity(change) {
    let current = parseInt(Elements.qtyInput.value) || 1;
    current = Math.max(1, Math.min(99, current + change));
    Elements.qtyInput.value = current;
    AppState.currentQuantity = current;
}

function updateQtyFromInput() {
    let value = parseInt(Elements.qtyInput.value) || 1;
    value = Math.max(1, Math.min(99, value));
    Elements.qtyInput.value = value;
    AppState.currentQuantity = value;
}

function updateSelectedQuantity() {
    if (AppState.selectedItemIndex === null) {
        showNotification('Pilih item terlebih dahulu', 'warning');
        return;
    }
    
    const newQty = parseInt(Elements.qtyInput.value) || 1;
    if (newQty < 1 || newQty > 99) {
        showNotification('Jumlah harus antara 1-99', 'error');
        return;
    }
    
    AppState.orderItems[AppState.selectedItemIndex].quantity = newQty;
    AppState.currentQuantity = newQty;
    
    updateOrderDisplay();
    updateOrderSummary();
    addActivityLog(`Diupdate: ${AppState.orderItems[AppState.selectedItemIndex].name} → ${newQty}pcs`, 'info');
}

function updateOrderSummary() {
    const subtotal = AppState.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = AppState.orderItems.reduce((sum, item) => sum + item.quantity, 0);
    
    Elements.subtotal.textContent = formatRupiah(subtotal);
    Elements.itemCount.textContent = itemCount;
    Elements.totalAmount.textContent = formatRupiah(subtotal);
    
    // Update payment validation
    validatePayment();
}

function clearOrder() {
    if (AppState.orderItems.length === 0) return;
    
    if (confirm('Apakah Anda yakin ingin mengosongkan pesanan?')) {
        AppState.orderItems = [];
        AppState.selectedItemIndex = null;
        Elements.cashAmount.value = '';
        Elements.changeAmount.textContent = 'Rp 0';
        
        updateOrderDisplay();
        updateOrderSummary();
        updatePaymentStatus('info', 'Pesanan dikosongkan');
        
        addActivityLog('Semua pesanan dikosongkan', 'warning');
        showNotification('Pesanan dikosongkan', 'warning');
    }
}

// ===== PAYMENT PROCESSING =====

function validatePayment() {
    const total = AppState.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cash = parseFloat(Elements.cashAmount.value) || 0;
    
    if (total === 0) {
        Elements.btnProcess.disabled = true;
        updatePaymentStatus('info', 'Tambahkan item terlebih dahulu');
        return;
    }
    
    if (cash === 0) {
        Elements.btnProcess.disabled = true;
        updatePaymentStatus('info', 'Masukkan jumlah uang');
        return;
    }
    
    if (cash < total) {
        const kurang = total - cash;
        Elements.btnProcess.disabled = true;
        updatePaymentStatus('error', `Kurang ${formatRupiah(kurang)}`);
        return;
    }
    
    Elements.btnProcess.disabled = false;
    updatePaymentStatus('success', 'Pembayaran valid');
}

function calculateChange() {
    const total = AppState.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cash = parseFloat(Elements.cashAmount.value) || 0;
    
    if (cash === 0) {
        showNotification('Masukkan jumlah uang terlebih dahulu', 'warning');
        return;
    }
    
    if (cash < total) {
        const kurang = total - cash;
        showNotification(`Uang kurang ${formatRupiah(kurang)}`, 'error');
        return;
    }
    
    const change = cash - total;
    Elements.changeAmount.textContent = formatRupiah(change);
    
    updatePaymentStatus('success', `Kembalian: ${formatRupiah(change)}`);
    addActivityLog(`Dihitung: Uang ${formatRupiah(cash)}, Kembalian ${formatRupiah(change)}`, 'info');
}

async function processTransaction() {
    const total = AppState.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cash = parseFloat(Elements.cashAmount.value) || 0;
    
    if (cash < total || AppState.orderItems.length === 0) {
        showNotification('Pembayaran tidak valid', 'error');
        return;
    }
    
    // Show processing
    showLoading(true);
    Elements.btnProcess.disabled = true;
    
    // Create transaction data
    const transactionData = {
        transaction_id: 'T' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase(),
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID'),
        items: AppState.orderItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity
        })),
        subtotal: total,
        total: total,
        cash_received: cash,
        change: cash - total,
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    
    try {
        // Save to Google Sheets
        let saveResult = false;
        
        if (AppState.config.scriptUrl && AppState.isOnline) {
            saveResult = await saveToGoogleSheets(transactionData);
        }
        
        if (!saveResult) {
            // Save to sync queue
            AppState.syncQueue.push(transactionData);
            localStorage.setItem('zeta_sync_queue', JSON.stringify(AppState.syncQueue));
            transactionData.status = 'pending_sync';
        }
        
        // Save to local history
        AppState.transactionHistory.push(transactionData);
        localStorage.setItem('zeta_transaction_history', JSON.stringify(AppState.transactionHistory));
        
        // Update transaction count
        Elements.transactionCount.textContent = AppState.transactionHistory.length;
        
        // Show success modal
        showSuccessModal(true, transactionData);
        
        // Reset for next transaction
        setTimeout(() => {
            AppState.orderItems = [];
            AppState.selectedItemIndex = null;
            Elements.cashAmount.value = '';
            Elements.changeAmount.textContent = 'Rp 0';
            
            updateOrderDisplay();
            updateOrderSummary();
            showLoading(false);
            
            addActivityLog(`Transaksi selesai: ${formatRupiah(total)}`, 'success');
            
        }, 2000);
        
    } catch (error) {
        console.error('Transaction error:', error);
        showNotification('Gagal memproses transaksi', 'error');
        showLoading(false);
        Elements.btnProcess.disabled = false;
    }
}

function updatePaymentStatus(type, message) {
    Elements.paymentStatus.className = `calc-status ${type}`;
    Elements.paymentStatus.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
}

// ===== GOOGLE SHEETS INTEGRATION =====

async function saveToGoogleSheets(transactionData) {
    if (!AppState.config.scriptUrl) return false;
    
    try {
        // Method 1: Standard JSON POST
        const response = await fetch(AppState.config.scriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(transactionData),
            mode: 'cors'
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Google Sheets save success:', result);
            
            // Update sync status
            updateSyncStatus(true, 'Data terkirim ke Google Sheets');
            addActivityLog('Data disimpan ke Google Sheets', 'success');
            
            return true;
        }
        
        throw new Error(`HTTP ${response.status}`);
        
    } catch (error) {
        console.error('❌ Google Sheets save failed:', error);
        
        // Add to sync queue
        AppState.syncQueue.push({
            ...transactionData,
            status: 'pending_sync',
            error: error.message,
            retry_count: 0
        });
        
        localStorage.setItem('zeta_sync_queue', JSON.stringify(AppState.syncQueue));
        updateSyncStatus(false, 'Gagal sync, data disimpan lokal');
        
        return false;
    }
}

async function testConnection() {
    const scriptUrl = Elements.scriptUrl.value.trim();
    
    if (!scriptUrl) {
        showTestResult('Masukkan URL Apps Script terlebih dahulu', 'error');
        return;
    }
    
    showTestResult('Menguji koneksi...', 'info');
    
    try {
        const response = await fetch(scriptUrl + '?test=true');
        const data = await response.json();
        
        if (data.status === 'alive') {
            showTestResult('✅ Koneksi berhasil! Sistem siap digunakan.', 'success');
            AppState.isOnline = true;
            updateConnectionStatus(true);
        } else {
            showTestResult('❌ Koneksi gagal. Periksa URL dan deployment.', 'error');
        }
    } catch (error) {
        showTestResult(`❌ Koneksi gagal: ${error.message}`, 'error');
    }
}

function showTestResult(message, type) {
    Elements.testResult.textContent = message;
    Elements.testResult.className = `test-result ${type}`;
    Elements.testResult.style.display = 'block';
}

// ===== SETTINGS =====

function showSettingsModal(show) {
    if (show) {
        // Load current settings
        Elements.scriptUrl.value = AppState.config.scriptUrl;
        Elements.spreadsheetId.value = AppState.config.spreadsheetId;
        
        Elements.settingsModal.classList.add('active');
    } else {
        Elements.settingsModal.classList.remove('active');
        Elements.testResult.style.display = 'none';
    }
}

function saveSettings() {
    const scriptUrl = Elements.scriptUrl.value.trim();
    const spreadsheetId = Elements.spreadsheetId.value.trim();
    
    if (!scriptUrl) {
        showNotification('URL Apps Script wajib diisi', 'error');
        return;
    }
    
    // Save to config
    AppState.config.scriptUrl = scriptUrl;
    AppState.config.spreadsheetId = spreadsheetId;
    
    // Save to localStorage
    localStorage.setItem('zeta_script_url', scriptUrl);
    localStorage.setItem('zeta_spreadsheet_id', spreadsheetId);
    
    // Test connection
    testConnection();
    
    showSettingsModal(false);
    showNotification('Pengaturan disimpan', 'success');
    addActivityLog('Pengaturan sistem diperbarui', 'info');
}

// ===== SUCCESS MODAL =====

function showSuccessModal(show, transactionData = null) {
    if (show && transactionData) {
        Elements.successTotal.textContent = formatRupiah(transactionData.total);
        Elements.successCash.textContent = formatRupiah(transactionData.cash_received);
        Elements.successChange.textContent = formatRupiah(transactionData.change);
        Elements.successId.textContent = transactionData.transaction_id;
        
        Elements.successModal.classList.add('active');
    } else {
        Elements.successModal.classList.remove('active');
    }
}

// ===== UTILITIES =====

function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function updateUI() {
    updateOrderDisplay();
    updateOrderSummary();
    updateConnectionStatus(AppState.isOnline);
}

function updateConnectionStatus(online) {
    const indicator = Elements.connectionStatus.querySelector('.status-indicator');
    const text = Elements.connectionStatus.querySelector('span');
    
    if (online) {
        indicator.className = 'status-indicator online';
        text.textContent = 'Terhubung';
        AppState.isOnline = true;
    } else {
        indicator.className = 'status-indicator offline';
        text.textContent = 'Offline';
        AppState.isOnline = false;
    }
}

function updateSyncStatus(online, message) {
    Elements.syncStatus.textContent = `Sinkronisasi: ${online ? 'Online' : 'Offline'}`;
    Elements.lastSync.textContent = new Date().toLocaleTimeString('id-ID');
    
    if (!online && message) {
        addActivityLog(message, 'warning');
    }
}

function addActivityLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const logEntry = document.createElement('div');
    logEntry.className = 'log-item';
    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${message}</span>
    `;
    
    Elements.activityLog.prepend(logEntry);
    
    // Keep only last 10 logs
    const logs = Elements.activityLog.querySelectorAll('.log-item');
    if (logs.length > 10) {
        for (let i = 10; i < logs.length; i++) {
            logs[i].remove();
        }
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'notificationSlideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

function openDashboard() {
    window.open('dashboard.html', '_blank');
}

function quickSale() {
    // Quick sale: Nasi Daun Jeruk x1
    addOrderItem('nasi-dasar', 1);
    showNotification('Quick sale: Nasi Daun Jeruk ditambahkan', 'info');
}

function printReceipt() {
    window.print();
}

// Make functions available globally
window.showSettingsModal = showSettingsModal;
window.testConnection = testConnection;
window.saveSettings = saveSettings;
window.adjustQuantity = adjustQuantity;
window.removeOrderItem = removeOrderItem;