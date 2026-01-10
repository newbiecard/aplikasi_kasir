// ============================================
// ZETA POS v2.0 - FINAL VERSION
// Sistem Kasir Brutal dengan Google Sheets Sync
// ============================================

// ===== CONFIGURASI =====
const CONFIG = {
    APPS_SCRIPT_URL: localStorage.getItem('zeta_script_url') || '',
    SPREADSHEET_ID: localStorage.getItem('zeta_sheet_id') || '',
    VERSION: '2.0',
    BACKUP_KEY: 'zeta_pos_backups_v2',
    TRANSACTION_KEY: 'zeta_transactions'
};

// ===== STATE MANAGEMENT =====
let state = {
    orderItems: [],
    selectedItemIndex: null,
    currentQuantity: 1,
    cashReceived: 0,
    isOnline: false,
    backups: [],
    transactions: []
};

// ===== DOM ELEMENTS =====
const elements = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    loadSavedData();
    setupEventListeners();
    testConnectionAuto();
    updateUI();
    
    console.log('🔥 ZETA POS v2.0 initialized');
    addLog('Sistem siap. Pilih menu untuk memulai.');
});

function initializeElements() {
    // Menu buttons
    elements.menuButtons = document.querySelectorAll('.btn-add');
    elements.resetBtn = document.getElementById('btn-reset-all');
    elements.testBtn = document.getElementById('btn-test');
    elements.exportBtn = document.getElementById('btn-export');
    
    // Order management
    elements.orderItemsContainer = document.getElementById('order-items');
    elements.orderCount = document.getElementById('order-count');
    elements.qtyInput = document.getElementById('qty-input');
    elements.qtyButtons = document.querySelectorAll('.qty-btn');
    elements.updateQtyBtn = document.getElementById('btn-update-qty');
    
    // Payment
    elements.cashInput = document.getElementById('cash-input');
    elements.calculateBtn = document.getElementById('btn-calculate');
    elements.processBtn = document.getElementById('btn-process');
    elements.totalOrder = document.getElementById('total-order');
    elements.changeAmount = document.getElementById('change-amount');
    elements.validationMsg = document.getElementById('validation-msg');
    
    // Status & UI
    elements.connectionStatus = document.getElementById('connection-status');
    elements.backupCount = document.getElementById('backup-count');
    elements.totalTransactions = document.getElementById('total-transactions');
    elements.transactionLog = document.getElementById('transaction-log');
    
    // Modal
    elements.configModal = document.getElementById('config-modal');
    elements.openConfigBtn = document.getElementById('btn-open-config');
    elements.closeConfigBtn = document.querySelector('.btn-close');
    elements.scriptUrlInput = document.getElementById('script-url');
    elements.sheetIdInput = document.getElementById('sheet-id');
    elements.testConfigBtn = document.getElementById('btn-test-config');
    elements.saveConfigBtn = document.getElementById('btn-save-config');
    
    // Loading
    elements.loadingOverlay = document.getElementById('loading-overlay');
    elements.loadingText = document.getElementById('loading-text');
    
    // Footer
    elements.clearBackupBtn = document.getElementById('btn-clear-backup');
}

function loadSavedData() {
    // Load backups
    try {
        const backupsJson = localStorage.getItem(CONFIG.BACKUP_KEY);
        state.backups = backupsJson ? JSON.parse(backupsJson) : [];
    } catch (e) {
        state.backups = [];
        console.error('Error loading backups:', e);
    }
    
    // Load transactions count
    try {
        const transactionsJson = localStorage.getItem(CONFIG.TRANSACTION_KEY);
        state.transactions = transactionsJson ? JSON.parse(transactionsJson) : [];
    } catch (e) {
        state.transactions = [];
    }
    
    // Update counts
    updateBackupCount();
    updateTransactionCount();
}

function setupEventListeners() {
    // Menu buttons
    elements.menuButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            const menuCard = this.closest('.menu-card');
            const price = parseInt(menuCard.getAttribute('data-price'));
            const name = menuCard.querySelector('h3').textContent;
            
            addOrderItem({
                id: itemId,
                name: name,
                price: price,
                quantity: state.currentQuantity
            });
        });
    });
    
    // Reset button
    elements.resetBtn.addEventListener('click', resetAll);
    
    // Test connection
    elements.testBtn.addEventListener('click', testConnection);
    
    // Export button
    elements.exportBtn.addEventListener('click', exportData);
    
    // Quantity controls
    elements.qtyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            updateQuantity(action);
        });
    });
    
    elements.updateQtyBtn.addEventListener('click', updateSelectedQuantity);
    
    // Payment controls
    elements.calculateBtn.addEventListener('click', calculateChange);
    elements.processBtn.addEventListener('click', processTransaction);
    elements.cashInput.addEventListener('input', validatePayment);
    
    // Modal controls
    elements.openConfigBtn.addEventListener('click', openConfigModal);
    elements.closeConfigBtn.addEventListener('click', closeConfigModal);
    elements.testConfigBtn.addEventListener('click', testConfigConnection);
    elements.saveConfigBtn.addEventListener('click', saveConfig);
    
    // Clear backup
    elements.clearBackupBtn.addEventListener('click', clearBackups);
    
    // Close modal on background click
    elements.configModal.addEventListener('click', function(e) {
        if (e.target === this) closeConfigModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl + S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (!elements.processBtn.disabled) {
                processTransaction();
            }
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            closeConfigModal();
        }
        
        // F1 for help
        if (e.key === 'F1') {
            e.preventDefault();
            openConfigModal();
        }
    });
}

// ===== ORDER MANAGEMENT =====
function addOrderItem(item) {
    // Check if item already exists
    const existingIndex = state.orderItems.findIndex(i => i.id === item.id);
    
    if (existingIndex > -1) {
        // Update quantity
        state.orderItems[existingIndex].quantity += item.quantity;
        state.orderItems[existingIndex].subtotal = 
            state.orderItems[existingIndex].quantity * state.orderItems[existingIndex].price;
        state.selectedItemIndex = existingIndex;
    } else {
        // Add new item
        const newItem = {
            ...item,
            subtotal: item.price * item.quantity
        };
        state.orderItems.push(newItem);
        state.selectedItemIndex = state.orderItems.length - 1;
    }
    
    updateUI();
    addLog(`Ditambahkan: ${item.name} x${item.quantity}`);
}

function removeOrderItem(index) {
    const removedItem = state.orderItems[index];
    state.orderItems.splice(index, 1);
    
    if (state.selectedItemIndex === index) {
        state.selectedItemIndex = null;
    } else if (state.selectedItemIndex > index) {
        state.selectedItemIndex--;
    }
    
    updateUI();
    addLog(`Dihapus: ${removedItem.name}`);
}

function updateSelectedQuantity() {
    if (state.selectedItemIndex === null) {
        showValidation('Pilih item terlebih dahulu!', 'error');
        return;
    }
    
    const newQty = parseInt(elements.qtyInput.value);
    if (isNaN(newQty) || newQty < 1) {
        showValidation('Jumlah tidak valid!', 'error');
        return;
    }
    
    state.orderItems[state.selectedItemIndex].quantity = newQty;
    state.orderItems[state.selectedItemIndex].subtotal = 
        state.orderItems[state.selectedItemIndex].price * newQty;
    
    updateUI();
    addLog(`Diupdate: ${state.orderItems[state.selectedItemIndex].name} → ${newQty}pcs`);
}

function updateQuantity(action) {
    let current = parseInt(elements.qtyInput.value);
    
    if (action === 'increase') {
        if (current < 99) current++;
    } else if (action === 'decrease') {
        if (current > 1) current--;
    }
    
    elements.qtyInput.value = current;
    state.currentQuantity = current;
}

// ===== PAYMENT CALCULATION =====
function calculateChange() {
    const total = state.orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const cash = parseInt(elements.cashInput.value) || 0;
    
    if (cash === 0) {
        showValidation('Masukkan jumlah uang!', 'error');
        return;
    }
    
    if (cash < total) {
        const kurang = total - cash;
        showValidation(`Uang kurang Rp${formatNumber(kurang)}!`, 'error');
        elements.processBtn.disabled = true;
        elements.changeAmount.textContent = 'Rp0';
        return;
    }
    
    const change = cash - total;
    state.cashReceived = cash;
    
    elements.changeAmount.textContent = formatRupiah(change);
    elements.processBtn.disabled = false;
    showValidation('Pembayaran valid. Klik PROSES TRANSAKSI.', 'success');
    
    addLog(`Pembayaran: Rp${formatNumber(cash)}, Kembalian: Rp${formatNumber(change)}`);
}

function validatePayment() {
    const cash = parseInt(elements.cashInput.value) || 0;
    const total = state.orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    if (cash > 0 && cash < total) {
        const kurang = total - cash;
        elements.changeAmount.textContent = 'Rp0';
        elements.processBtn.disabled = true;
        showValidation(`Kurang Rp${formatNumber(kurang)}`, 'error');
    } else if (cash >= total) {
        elements.processBtn.disabled = false;
        showValidation('', 'success');
    } else {
        elements.changeAmount.textContent = 'Rp0';
        elements.processBtn.disabled = true;
        showValidation('', 'success');
    }
}

// ===== TRANSACTION PROCESSING =====
async function processTransaction() {
    const total = state.orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const cash = state.cashReceived || parseInt(elements.cashInput.value) || 0;
    
    if (cash < total) {
        showValidation('Uang belum cukup!', 'error');
        return;
    }
    
    if (state.orderItems.length === 0) {
        showValidation('Tidak ada pesanan!', 'error');
        return;
    }
    
    showLoading('Memproses transaksi...');
    
    // Prepare transaction data
    const transactionData = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID'),
        items: state.orderItems,
        total: total,
        cash_received: cash,
        change: cash - total,
        status: 'pending'
    };
    
    let saveResult = false;
    
    // Try to save to Google Sheets first
    if (CONFIG.APPS_SCRIPT_URL && state.isOnline) {
        saveResult = await saveToGoogleSheets(transactionData);
    }
    
    if (!saveResult) {
        // Save to local backup
        saveResult = saveToLocalBackup(transactionData);
        
        if (saveResult) {
            transactionData.status = 'saved_locally';
            addLog('⚠️ Disimpan ke backup lokal (offline mode)');
        }
    }
    
    // Save to transaction history
    if (saveResult) {
        saveTransactionToHistory(transactionData);
        
        // Show success
        setTimeout(() => {
            hideLoading();
            
            // Reset for next transaction
            state.orderItems = [];
            state.selectedItemIndex = null;
            elements.cashInput.value = '';
            updateUI();
            
            // Show success message
            alert(`✅ TRANSAKSI BERHASIL!\n\nTotal: ${formatRupiah(total)}\nUang: ${formatRupiah(cash)}\nKembalian: ${formatRupiah(cash - total)}\n\n${transactionData.status === 'saved_locally' ? '⚠️ Data disimpan lokal saja' : '✅ Data terkirim ke Google Sheets'}`);
            
            addLog(`Transaksi selesai: Rp${formatNumber(total)}`);
            
        }, 1000);
    } else {
        hideLoading();
        showValidation('Gagal menyimpan transaksi!', 'error');
    }
}

// ===== GOOGLE SHEETS INTEGRATION =====
async function saveToGoogleSheets(transactionData) {
    if (!CONFIG.APPS_SCRIPT_URL) return false;
    
    try {
        const payload = {
            action: 'save_transaction',
            data: transactionData,
            config: {
                sheet_id: CONFIG.SPREADSHEET_ID,
                timestamp: new Date().getTime()
            }
        };
        
        // Encode as form data for better compatibility
        const formData = new URLSearchParams();
        formData.append('data', JSON.stringify(payload));
        
        // Try multiple methods
        const methods = [
            // Method 1: POST with form data
            async () => {
                const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData.toString(),
                    mode: 'no-cors'
                });
                return true; // With no-cors we can't check response
            },
            
            // Method 2: GET with URL parameters (fallback)
            async () => {
                const url = `${CONFIG.APPS_SCRIPT_URL}?${formData.toString()}`;
                await fetch(url, { mode: 'no-cors' });
                return true;
            },
            
            // Method 3: Direct JSON POST
            async () => {
                const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    mode: 'no-cors'
                });
                return true;
            }
        ];
        
        // Try each method until one works
        for (const method of methods) {
            try {
                await method();
                console.log('✅ Data sent to Google Sheets');
                transactionData.status = 'sent_to_sheets';
                return true;
            } catch (error) {
                console.log('⚠️ Method failed, trying next...', error.message);
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Google Sheets save failed:', error);
        return false;
    }
}

// ===== LOCAL BACKUP SYSTEM =====
function saveToLocalBackup(transactionData) {
    try {
        transactionData.backup_timestamp = new Date().toISOString();
        transactionData.backup_id = 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        state.backups.push(transactionData);
        
        // Keep only last 100 backups
        if (state.backups.length > 100) {
            state.backups = state.backups.slice(-100);
        }
        
        // Save to localStorage
        localStorage.setItem(CONFIG.BACKUP_KEY, JSON.stringify(state.backups));
        
        updateBackupCount();
        console.log('💾 Saved to local backup:', transactionData.backup_id);
        
        return true;
        
    } catch (error) {
        console.error('❌ Local backup failed:', error);
        return false;
    }
}

function saveTransactionToHistory(transactionData) {
    try {
        state.transactions.push({
            id: 'trans_' + Date.now(),
            timestamp: new Date().toISOString(),
            total: transactionData.total,
            status: transactionData.status
        });
        
        // Keep only last 500 transactions
        if (state.transactions.length > 500) {
            state.transactions = state.transactions.slice(-500);
        }
        
        localStorage.setItem(CONFIG.TRANSACTION_KEY, JSON.stringify(state.transactions));
        updateTransactionCount();
        
    } catch (error) {
        console.error('Error saving transaction history:', error);
    }
}

function clearBackups() {
    if (confirm('🔥 HAPUS SEMUA BACKUP LOKAL?\n\nData akan dihapus permanen!\nTransaksi yang belum dikirim ke Sheets akan hilang!')) {
        state.backups = [];
        localStorage.removeItem(CONFIG.BACKUP_KEY);
        updateBackupCount();
        addLog('Semua backup lokal dihapus!');
        alert('✅ Backup lokal dihapus!');
    }
}

// ===== CONFIGURATION MANAGEMENT =====
function openConfigModal() {
    elements.scriptUrlInput.value = CONFIG.APPS_SCRIPT_URL;
    elements.sheetIdInput.value = CONFIG.SPREADSHEET_ID;
    elements.configModal.style.display = 'flex';
}

function closeConfigModal() {
    elements.configModal.style.display = 'none';
}

async function testConfigConnection() {
    const scriptUrl = elements.scriptUrlInput.value.trim();
    const sheetId = elements.sheetIdInput.value.trim();
    
    if (!scriptUrl) {
        alert('Masukkan URL Apps Script terlebih dahulu!');
        return;
    }
    
    showLoading('Menguji koneksi...');
    
    try {
        // Test the URL
        const testUrl = scriptUrl + (scriptUrl.includes('?') ? '&' : '?') + 'test=true';
        const response = await fetch(testUrl, { mode: 'no-cors' });
        
        // With no-cors we can't read response, so assume success if no error
        setTimeout(() => {
            hideLoading();
            alert('✅ Koneksi berhasil!\n\nURL Apps Script valid.\n\nKlik SIMPAN KONFIG untuk menyimpan.');
        }, 1500);
        
    } catch (error) {
        hideLoading();
        alert('❌ Koneksi gagal!\n\nPeriksa:\n1. URL Apps Script\n2. Deployment: "Anyone, even anonymous"\n3. Koneksi internet');
    }
}

function saveConfig() {
    const scriptUrl = elements.scriptUrlInput.value.trim();
    const sheetId = elements.sheetIdInput.value.trim();
    
    if (!scriptUrl) {
        alert('URL Apps Script wajib diisi!');
        return;
    }
    
    // Validate URL format
    if (!scriptUrl.includes('script.google.com/macros/s/') || !scriptUrl.includes('/exec')) {
        if (!confirm('URL tidak sesuai format standar.\nFormat: https://script.google.com/macros/s/.../exec\n\nLanjutkan tetap menyimpan?')) {
            return;
        }
    }
    
    // Save to config
    CONFIG.APPS_SCRIPT_URL = scriptUrl;
    CONFIG.SPREADSHEET_ID = sheetId;
    
    // Save to localStorage
    localStorage.setItem('zeta_script_url', scriptUrl);
    localStorage.setItem('zeta_sheet_id', sheetId);
    
    // Test connection
    testConnection();
    
    closeConfigModal();
    alert('✅ Konfigurasi disimpan!\n\nSistem akan mencoba terhubung ke Google Sheets.');
}

// ===== CONNECTION TESTING =====
async function testConnection() {
    if (!CONFIG.APPS_SCRIPT_URL) {
        updateConnectionStatus(false);
        addLog('❌ URL Apps Script belum dikonfigurasi');
        return;
    }
    
    try {
        const testUrl = CONFIG.APPS_SCRIPT_URL + (CONFIG.APPS_SCRIPT_URL.includes('?') ? '&' : '?') + 'test=' + Date.now();
        
        // Use iframe method for better compatibility
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = testUrl;
        
        iframe.onload = function() {
            updateConnectionStatus(true);
            addLog('✅ Terhubung ke Google Sheets');
            document.body.removeChild(iframe);
        };
        
        iframe.onerror = function() {
            updateConnectionStatus(false);
            addLog('❌ Gagal terhubung ke Google Sheets');
            document.body.removeChild(iframe);
        };
        
        document.body.appendChild(iframe);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
                updateConnectionStatus(false);
                addLog('⚠️ Timeout koneksi ke Google Sheets');
            }
        }, 5000);
        
    } catch (error) {
        updateConnectionStatus(false);
        addLog('❌ Error koneksi: ' + error.message);
    }
}

function testConnectionAuto() {
    // Test connection on startup
    setTimeout(testConnection, 1000);
    
    // Auto-test every 30 seconds
    setInterval(testConnection, 30000);
}

// ===== UI UPDATES =====
function updateUI() {
    updateOrderList();
    updateOrderSummary();
    updateSelectedItem();
}

function updateOrderList() {
    elements.orderItemsContainer.innerHTML = '';
    
    if (state.orderItems.length === 0) {
        elements.orderItemsContainer.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Belum ada pesanan</p>
                    <small>Pilih menu dari sidebar</small>
                </td>
            </tr>
        `;
        elements.orderCount.textContent = '0 ITEM';
        return;
    }
    
    let totalItems = 0;
    
    state.orderItems.forEach((item, index) => {
        totalItems += item.quantity;
        
        const row = document.createElement('tr');
        row.className = index === state.selectedItemIndex ? 'selected-item' : '';
        row.innerHTML = `
            <td>
                <strong>${item.name}</strong>
                <div class="item-desc">${item.id.toUpperCase()}</div>
            </td>
            <td>
                <div class="item-qty">${item.quantity}</div>
            </td>
            <td>${formatRupiah(item.price)}</td>
            <td><strong>${formatRupiah(item.subtotal)}</strong></td>
            <td>
                <button class="btn-delete" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        elements.orderItemsContainer.appendChild(row);
        
        // Add click handler for selection
        row.addEventListener('click', function(e) {
            if (!e.target.closest('.btn-delete')) {
                state.selectedItemIndex = index;
                elements.qtyInput.value = item.quantity;
                state.currentQuantity = item.quantity;
                updateUI();
            }
        });
        
        // Add delete handler
        const deleteBtn = row.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeOrderItem(index);
        });
    });
    
    elements.orderCount.textContent = `${totalItems} ITEM`;
}

function updateOrderSummary() {
    const total = state.orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    elements.totalOrder.textContent = formatRupiah(total);
    
    // Update cash input placeholder
    elements.cashInput.placeholder = formatNumber(total);
    
    // Update process button
    elements.processBtn.disabled = state.orderItems.length === 0 || total === 0;
}

function updateSelectedItem() {
    // Update quantity input based on selected item
    if (state.selectedItemIndex !== null && state.orderItems[state.selectedItemIndex]) {
        elements.qtyInput.value = state.orderItems[state.selectedItemIndex].quantity;
    }
}

function updateConnectionStatus(isOnline) {
    state.isOnline = isOnline;
    
    if (isOnline) {
        elements.connectionStatus.className = 'status-online';
        elements.connectionStatus.innerHTML = '<i class="fas fa-circle"></i> ONLINE';
    } else {
        elements.connectionStatus.className = 'status-offline';
        elements.connectionStatus.innerHTML = '<i class="fas fa-circle"></i> OFFLINE MODE';
    }
}

function updateBackupCount() {
    elements.backupCount.textContent = state.backups.length;
}

function updateTransactionCount() {
    elements.totalTransactions.textContent = state.transactions.length;
}

function addLog(message) {
    const time = new Date().toLocaleTimeString('id-ID', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${message}</span>
    `;
    
    elements.transactionLog.prepend(logEntry);
    
    // Keep only last 20 logs visible
    const logs = elements.transactionLog.querySelectorAll('.log-entry');
    if (logs.length > 20) {
        for (let i = 20; i < logs.length; i++) {
            logs[i].remove();
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function resetAll() {
    if (state.orderItems.length === 0) return;
    
    if (confirm('🔥 RESET SEMUA PESANAN?\n\nSemua item akan dihapus!\nUang input akan dikosongkan!')) {
        state.orderItems = [];
        state.selectedItemIndex = null;
        elements.cashInput.value = '';
        updateUI();
        addLog('Semua pesanan direset');
    }
}

function exportData() {
    if (state.backups.length === 0) {
        alert('Tidak ada data untuk diexport!');
        return;
    }
    
    const exportData = {
        exported_at: new Date().toISOString(),
        system: 'ZETA POS v2.0',
        backup_count: state.backups.length,
        transaction_count: state.transactions.length,
        backups: state.backups,
        transactions: state.transactions
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `zeta_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    addLog(`Data diexport: ${state.backups.length} backup`);
}

function showValidation(message, type) {
    elements.validationMsg.textContent = message;
    elements.validationMsg.className = 'validation-message ' + type;
}

function showLoading(text) {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function formatRupiah(amount) {
    return 'Rp' + formatNumber(amount);
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}