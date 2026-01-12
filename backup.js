// ============================================
// NASI DAUN JERUK POS v2 - BACKUP MANAGEMENT
// ============================================

// Configuration
const CONFIG = {
    storageKey: "ndj_pos_v2_",
    itemsPerPage: 20
};

// State
let currentFilter = {
    startDate: '',
    endDate: '',
    paymentMethod: '',
    searchTerm: ''
};

let allTransactions = [];
let filteredTransactions = [];

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    loadTransactions();
    setupEventListeners();
    updateStatistics();
    renderTransactions();
});

// Event Listeners
function setupEventListeners() {
    // Theme sync with main app
    const savedTheme = localStorage.getItem(CONFIG.storageKey + 'state') 
        ? JSON.parse(localStorage.getItem(CONFIG.storageKey + 'state')).settings.theme 
        : 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', function(e) {
        currentFilter.searchTerm = e.target.value.toLowerCase();
        applyFilters();
    });
    
    // Date filters
    document.getElementById('startDate').addEventListener('change', function(e) {
        currentFilter.startDate = e.target.value;
        applyFilters();
    });
    
    document.getElementById('endDate').addEventListener('change', function(e) {
        currentFilter.endDate = e.target.value;
        applyFilters();
    });
    
    // Payment method filter
    document.getElementById('paymentMethodFilter').addEventListener('change', function(e) {
        currentFilter.paymentMethod = e.target.value;
        applyFilters();
    });
    
    // File input for import
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
}

// Load Transactions
function loadTransactions() {
    const saved = localStorage.getItem(CONFIG.storageKey + 'transactions');
    allTransactions = saved ? JSON.parse(saved) : [];
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    filteredTransactions = [...allTransactions];
}

// Render Transactions
function renderTransactions() {
    const tbody = document.getElementById('transactionsBody');
    const emptyState = document.getElementById('emptyState');
    const showingCount = document.getElementById('showingCount');
    const totalCount = document.getElementById('totalCount');
    
    totalCount.textContent = allTransactions.length;
    showingCount.textContent = filteredTransactions.length;
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    filteredTransactions.forEach((transaction, index) => {
        const date = new Date(transaction.timestamp);
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format items
        const itemsText = transaction.items
            .map(item => `${item.name} x${item.quantity}`)
            .join(', ');
        
        // Format payment info
        const paymentInfo = transaction.paymentMethod === 'cash' 
            ? `Rp ${transaction.cashPaid.toLocaleString('id-ID')}`
            : 'QRIS';
        
        const changeInfo = transaction.paymentMethod === 'cash'
            ? `Rp ${transaction.change.toLocaleString('id-ID')}`
            : '-';
        
        html += `
            <tr>
                <td><strong>${transaction.id}</strong></td>
                <td>${formattedDate}</td>
                <td title="${itemsText}">${itemsText.length > 50 ? itemsText.substring(0, 50) + '...' : itemsText}</td>
                <td>Rp ${transaction.total.toLocaleString('id-ID')}</td>
                <td>
                    <span class="method-badge ${transaction.paymentMethod === 'cash' ? 'method-cash' : 'method-qris'}">
                        ${transaction.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}
                    </span>
                </td>
                <td>${paymentInfo}</td>
                <td>${changeInfo}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" onclick="viewTransaction(${index})" title="Lihat detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action delete" onclick="deleteTransaction(${index})" title="Hapus transaksi">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Filter Functions
function applyFilters() {
    filteredTransactions = allTransactions.filter(transaction => {
        // Date filter
        if (currentFilter.startDate) {
            const startDate = new Date(currentFilter.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (new Date(transaction.timestamp) < startDate) return false;
        }
        
        if (currentFilter.endDate) {
            const endDate = new Date(currentFilter.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (new Date(transaction.timestamp) > endDate) return false;
        }
        
        // Payment method filter
        if (currentFilter.paymentMethod && transaction.paymentMethod !== currentFilter.paymentMethod) {
            return false;
        }
        
        // Search filter
        if (currentFilter.searchTerm) {
            const searchTerm = currentFilter.searchTerm.toLowerCase();
            const matchesId = transaction.id.toLowerCase().includes(searchTerm);
            const matchesItems = transaction.items.some(item => 
                item.name.toLowerCase().includes(searchTerm)
            );
            if (!matchesId && !matchesItems) return false;
        }
        
        return true;
    });
    
    renderTransactions();
}

function resetFilters() {
    currentFilter = {
        startDate: '',
        endDate: '',
        paymentMethod: '',
        searchTerm: ''
    };
    
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('paymentMethodFilter').value = '';
    document.getElementById('searchInput').value = '';
    
    filteredTransactions = [...allTransactions];
    renderTransactions();
    
    showToast('Filter berhasil direset', 'success');
}

// Statistics
function updateStatistics() {
    // Total transactions
    document.getElementById('totalTransactionsCount').textContent = allTransactions.length;
    
    // Total income
    const totalIncome = allTransactions.reduce((sum, t) => sum + t.total, 0);
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    
    // Today's transactions
    const today = new Date().toDateString();
    const todayCount = allTransactions.filter(t => 
        new Date(t.timestamp).toDateString() === today
    ).length;
    document.getElementById('todayTransactions').textContent = todayCount;
    
    // QRIS percentage
    const qrisCount = allTransactions.filter(t => t.paymentMethod === 'qris').length;
    const qrisPercentage = allTransactions.length > 0 
        ? Math.round((qrisCount / allTransactions.length) * 100) 
        : 0;
    document.getElementById('qrisPercentage').textContent = `${qrisPercentage}%`;
}

// Backup Functions
function createBackup() {
    if (allTransactions.length === 0) {
        showToast('Tidak ada data untuk di-backup', 'warning');
        return;
    }
    
    const backupData = {
        app: "Nasi Daun Jeruk POS v2",
        version: "2.0.0",
        exportDate: new Date().toISOString(),
        transactionCount: allTransactions.length,
        totalIncome: allTransactions.reduce((sum, t) => sum + t.total, 0),
        transactions: allTransactions
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-nasidaunjeruk-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Backup ${allTransactions.length} transaksi berhasil dibuat`, 'success');
}

function exportToCSV() {
    if (allTransactions.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    // CSV headers
    let csv = 'ID Transaksi,Tanggal,Item,Jumlah,Total,Metode Bayar,Uang Bayar,Kembalian\n';
    
    // Add rows
    allTransactions.forEach(t => {
        const items = t.items.map(item => `${item.name} x${item.quantity}`).join('; ');
        const date = new Date(t.timestamp).toLocaleString('id-ID');
        const payment = t.paymentMethod === 'cash' ? 'Tunai' : 'QRIS';
        const cashPaid = t.paymentMethod === 'cash' ? t.cashPaid : 'QRIS';
        const change = t.paymentMethod === 'cash' ? t.change : '-';
        
        csv += `"${t.id}","${date}","${items}",${t.items.length},${t.total},${payment},${cashPaid},${change}\n`;
    });
    
    // Create and download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-nasidaunjeruk-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Export ${allTransactions.length} transaksi ke CSV berhasil`, 'success');
}

// Import Functions
function importData() {
    document.getElementById('importModal').style.display = 'flex';
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate backup file
            if (!data.transactions || !Array.isArray(data.transactions)) {
                throw new Error('Format file backup tidak valid');
            }
            
            // Show preview
            const preview = document.getElementById('importPreview');
            const previewContent = document.getElementById('previewContent');
            
            previewContent.innerHTML = `
                <p><strong>Aplikasi:</strong> ${data.app || 'Tidak diketahui'}</p>
                <p><strong>Tanggal Export:</strong> ${new Date(data.exportDate).toLocaleString('id-ID')}</p>
                <p><strong>Jumlah Transaksi:</strong> ${data.transactionCount || data.transactions.length}</p>
                <p><strong>Total Income:</strong> ${formatCurrency(data.totalIncome || data.transactions.reduce((sum, t) => sum + (t.total || 0), 0))}</p>
            `;
            
            preview.style.display = 'block';
            document.getElementById('confirmImport').disabled = false;
            
            // Store imported data
            window.importedData = data.transactions;
            
        } catch (error) {
            showToast(`Error membaca file: ${error.message}`, 'error');
            document.getElementById('confirmImport').disabled = true;
        }
    };
    
    reader.readAsText(file);
}

function processImport() {
    if (!window.importedData || !Array.isArray(window.importedData)) {
        showToast('Tidak ada data yang valid untuk diimport', 'error');
        return;
    }
    
    // Merge with existing transactions
    const existingTransactions = allTransactions;
    const newTransactions = window.importedData.filter(newTrans => 
        !existingTransactions.some(existing => existing.id === newTrans.id)
    );
    
    if (newTransactions.length === 0) {
        showToast('Tidak ada transaksi baru untuk diimport', 'warning');
        return;
    }
    
    // Add new transactions
    allTransactions.push(...newTransactions);
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Save to localStorage
    localStorage.setItem(CONFIG.storageKey + 'transactions', JSON.stringify(allTransactions));
    
    // Update UI
    filteredTransactions = [...allTransactions];
    renderTransactions();
    updateStatistics();
    
    showToast(`Berhasil mengimport ${newTransactions.length} transaksi baru`, 'success');
    closeImportModal();
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('confirmImport').disabled = true;
    window.importedData = null;
}

// Delete Functions
function deleteTransaction(index) {
    const transaction = filteredTransactions[index];
    
    window.currentDeleteIndex = index;
    window.currentDeleteType = 'single';
    
    document.getElementById('deleteMessage').textContent = 
        `Apakah Anda yakin ingin menghapus transaksi ${transaction.id}? Tindakan ini tidak dapat dibatalkan.`;
    document.getElementById('deleteModal').style.display = 'flex';
}

function confirmDeleteAll() {
    if (allTransactions.length === 0) {
        showToast('Tidak ada data untuk dihapus', 'warning');
        return;
    }
    
    window.currentDeleteType = 'all';
    
    document.getElementById('deleteMessage').textContent = 
        `Apakah Anda yakin ingin menghapus SEMUA ${allTransactions.length} transaksi? Tindakan ini tidak dapat dibatalkan.`;
    document.getElementById('deleteModal').style.display = 'flex';
}

function confirmDelete() {
    if (window.currentDeleteType === 'single') {
        const index = window.currentDeleteIndex;
        const transactionId = filteredTransactions[index].id;
        
        // Remove from all transactions
        const globalIndex = allTransactions.findIndex(t => t.id === transactionId);
        if (globalIndex !== -1) {
            allTransactions.splice(globalIndex, 1);
        }
        
        // Remove from filtered transactions
        filteredTransactions.splice(index, 1);
        
        // Save to localStorage
        localStorage.setItem(CONFIG.storageKey + 'transactions', JSON.stringify(allTransactions));
        
        // Update UI
        renderTransactions();
        updateStatistics();
        
        showToast('Transaksi berhasil dihapus', 'success');
        
    } else if (window.currentDeleteType === 'all') {
        // Clear all transactions
        allTransactions = [];
        filteredTransactions = [];
        
        // Save to localStorage
        localStorage.setItem(CONFIG.storageKey + 'transactions', JSON.stringify([]));
        
        // Update UI
        renderTransactions();
        updateStatistics();
        
        showToast('Semua transaksi berhasil dihapus', 'success');
    }
    
    closeDeleteModal();
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    window.currentDeleteIndex = null;
    window.currentDeleteType = null;
}

// View Transaction Details
function viewTransaction(index) {
    const transaction = filteredTransactions[index];
    
    let details = `
        <div style="background: var(--bg-tertiary); padding: var(--space-lg); border-radius: var(--radius-md); margin-bottom: var(--space-lg);">
            <h3>Detail Transaksi: ${transaction.id}</h3>
            <p><strong>Tanggal:</strong> ${new Date(transaction.timestamp).toLocaleString('id-ID')}</p>
            <p><strong>Metode Bayar:</strong> ${transaction.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}</p>
            <p><strong>Total:</strong> ${formatCurrency(transaction.total)}</p>
            ${transaction.paymentMethod === 'cash' ? `
                <p><strong>Uang Bayar:</strong> ${formatCurrency(transaction.cashPaid)}</p>
                <p><strong>Kembalian:</strong> ${formatCurrency(transaction.change)}</p>
            ` : ''}
        </div>
        
        <div style="margin-bottom: var(--space-lg);">
            <h4>Items:</h4>
            <div style="max-height: 200px; overflow-y: auto;">
    `;
    
    transaction.items.forEach((item, i) => {
        const itemTotal = (item.basePrice || 0) * item.quantity;
        details += `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong>${i+1}. ${item.name}</strong>
                    ${item.topping ? `<div style="font-size: 0.9em; color: var(--text-tertiary);">Topping: ${item.topping.name}</div>` : ''}
                </div>
                <div style="text-align: right;">
                    <div>${item.quantity} x ${formatCurrency(item.basePrice || 0)}</div>
                    <div><strong>${formatCurrency(itemTotal)}</strong></div>
                </div>
            </div>
        `;
    });
    
    details += `
            </div>
        </div>
        
        <div style="background: var(--bg-secondary); padding: var(--space-md); border-radius: var(--radius-md);">
            <strong>Subtotal:</strong> ${formatCurrency(transaction.subtotal || transaction.total)}<br>
            <strong>PPN (0%):</strong> ${formatCurrency(0)}<br>
            <strong>Total:</strong> ${formatCurrency(transaction.total)}
        </div>
    `;
    
    // Create custom modal for details
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <i class="fas fa-receipt"></i>
                <h3>Detail Transaksi</h3>
            </div>
            <div class="modal-body">
                ${details}
            </div>
            <div class="modal-footer">
                <button class="btn-modal-secondary" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i> Tutup
                </button>
                <button class="btn-modal-primary" onclick="printTransaction(${index})">
                    <i class="fas fa-print"></i> Cetak Ulang
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function printTransaction(index) {
    const transaction = filteredTransactions[index];
    
    let printHTML = `
        <html>
        <head>
            <title>Struk Ulang - ${transaction.id}</title>
            <style>
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { font-family: monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; }
                }
                body { font-family: monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; }
                .header { text-align: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
                .header h2 { margin: 5px 0; font-size: 16px; }
                .item { display: flex; justify-content: space-between; margin: 4px 0; }
                .total { font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000; }
                .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>STRUK ULANG</h2>
                <div>ID: ${transaction.id}</div>
                <div>${new Date(transaction.timestamp).toLocaleString('id-ID')}</div>
            </div>
    `;
    
    transaction.items.forEach(item => {
        const itemTotal = (item.basePrice || 0) * item.quantity;
        printHTML += `
            <div class="item">
                <div>${item.quantity}x ${item.name}</div>
                <div>${formatCurrency(itemTotal)}</div>
            </div>
        `;
    });
    
    printHTML += `
            <div class="total">
                <div>TOTAL: ${formatCurrency(transaction.total)}</div>
                <div>Metode: ${transaction.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}</div>
                ${transaction.paymentMethod === 'cash' ? `
                    <div>Bayar: ${formatCurrency(transaction.cashPaid)}</div>
                    <div>Kembali: ${formatCurrency(transaction.change)}</div>
                ` : ''}
            </div>
            <div class="footer">
                <p>Cetak ulang - Nasi Daun Jeruk POS</p>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastNotification');
    const titleEl = document.getElementById('toastTitle');
    const messageEl = document.getElementById('toastMessage');
    
    // Set toast type
    const icon = toast.querySelector('.toast-icon');
    switch(type) {
        case 'success':
            titleEl.textContent = 'Berhasil';
            icon.style.background = 'var(--success)';
            icon.innerHTML = '<i class="fas fa-check"></i>';
            break;
        case 'warning':
            titleEl.textContent = 'Peringatan';
            icon.style.background = 'var(--warning)';
            icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'error':
            titleEl.textContent = 'Error';
            icon.style.background = 'var(--error)';
            icon.innerHTML = '<i class="fas fa-times"></i>';
            break;
        default:
            titleEl.textContent = 'Info';
            icon.style.background = 'var(--info)';
            icon.innerHTML = '<i class="fas fa-info-circle"></i>';
    }
    
    messageEl.textContent = message;
    
    // Show toast
    toast.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        hideToast();
    }, 3000);
}

function hideToast() {
    const toast = document.getElementById('toastNotification');
    toast.classList.remove('show');
}

// Make functions available globally
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.createBackup = createBackup;
window.exportToCSV = exportToCSV;
window.importData = importData;
window.processImport = processImport;
window.closeImportModal = closeImportModal;
window.deleteTransaction = deleteTransaction;
window.confirmDeleteAll = confirmDeleteAll;
window.confirmDelete = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
window.viewTransaction = viewTransaction;
window.printTransaction = printTransaction;
window.hideToast = hideToast;

console.log('Backup Management System loaded');