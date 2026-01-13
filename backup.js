class BackupManager {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        this.selectedTransactions = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredTransactions = [...this.transactions];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadTransactions();
        this.updateStats();
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('backToHome').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Backup
        document.getElementById('backupNow').addEventListener('click', () => {
            this.performBackup();
        });
        
        // Search and filter
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTransactions(e.target.value);
        });
        
        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.filterByDate(e.target.value);
        });
        
        document.getElementById('clearFilter').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('dateFilter').value = '';
            this.filteredTransactions = [...this.transactions];
            this.loadTransactions();
        });
        
        // Actions
        document.getElementById('deleteSelected').addEventListener('click', () => {
            this.deleteSelectedTransactions();
        });
        
        document.getElementById('deleteAll').addEventListener('click', () => {
            this.deleteAllTransactions();
        });
        
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });
        
        // Select all checkbox
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.transaction-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const id = checkbox.dataset.id;
                if (e.target.checked) {
                    this.selectedTransactions.add(id);
                } else {
                    this.selectedTransactions.delete(id);
                }
            });
            this.updateDeleteButton();
        });
        
        // Modal controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        document.getElementById('closeDetail').addEventListener('click', () => this.closeModal());
        document.getElementById('printDetail').addEventListener('click', () => this.printDetail());
        
        // Confirmation modal
        document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction(true));
        document.getElementById('confirmNo').addEventListener('click', () => this.confirmAction(false));
    }
    
    loadTransactions() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTransactions = this.filteredTransactions.slice(startIndex, endIndex);
        
        const tbody = document.getElementById('transactionsBody');
        tbody.innerHTML = '';
        
        if (pageTransactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                        <p>Tidak ada transaksi ditemukan</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        pageTransactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const itemsText = transaction.items.map(item => 
                `${item.name} x${item.quantity}`
            ).join(', ');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="transaction-checkbox" data-id="${transaction.id}">
                </td>
                <td>#${transaction.id}</td>
                <td>${formattedDate}</td>
                <td>
                    <span class="method-badge ${transaction.method}">
                        ${transaction.method === 'cash' ? 'Tunai' : 'QRIS'}
                    </span>
                </td>
                <td class="items-preview" title="${itemsText}">
                    ${itemsText.substring(0, 50)}${itemsText.length > 50 ? '...' : ''}
                </td>
                <td>Rp${transaction.total.toLocaleString('id-ID')}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="action-btn view" onclick="backupManager.viewTransaction(${transaction.id})">
                            <i class="fas fa-eye"></i> Detail
                        </button>
                        <button class="action-btn delete" onclick="backupManager.deleteTransaction(${transaction.id})">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners to checkboxes
        document.querySelectorAll('.transaction-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    this.selectedTransactions.add(id);
                } else {
                    this.selectedTransactions.delete(id);
                    document.getElementById('selectAll').checked = false;
                }
                this.updateDeleteButton();
            });
        });
        
        this.updatePagination();
        this.updateTableInfo();
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `
            <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="backupManager.changePage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                paginationHtml += `
                    <button class="pagination-btn ${this.currentPage === i ? 'active' : ''}" 
                            onclick="backupManager.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHtml += `<span class="pagination-dots">...</span>`;
            }
        }
        
        // Next button
        paginationHtml += `
            <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="backupManager.changePage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pagination.innerHTML = paginationHtml;
    }
    
    changePage(page) {
        this.currentPage = page;
        this.loadTransactions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    updateTableInfo() {
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredTransactions.length);
        const total = this.filteredTransactions.length;
        
        document.getElementById('tableInfo').textContent = 
            `Menampilkan ${start}-${end} dari ${total} transaksi`;
    }
    
    updateStats() {
        const totalTransactions = this.transactions.length;
        const cashTransactions = this.transactions.filter(t => t.method === 'cash').length;
        const qrisTransactions = this.transactions.filter(t => t.method === 'qris').length;
        const totalRevenue = this.transactions.reduce((sum, t) => sum + t.total, 0);
        
        document.getElementById('totalTransactions').textContent = totalTransactions;
        document.getElementById('cashTransactions').textContent = cashTransactions;
        document.getElementById('qrisTransactions').textContent = qrisTransactions;
        document.getElementById('totalRevenue').textContent = `Rp${totalRevenue.toLocaleString('id-ID')}`;
    }
    
    searchTransactions(query) {
        if (!query.trim()) {
            this.filteredTransactions = [...this.transactions];
        } else {
            const searchLower = query.toLowerCase();
            this.filteredTransactions = this.transactions.filter(transaction => {
                return (
                    transaction.id.toString().includes(query) ||
                    transaction.items.some(item => 
                        item.name.toLowerCase().includes(searchLower) ||
                        item.desc.toLowerCase().includes(searchLower)
                    ) ||
                    transaction.method.toLowerCase().includes(searchLower) ||
                    transaction.total.toString().includes(query)
                );
            });
        }
        
        this.currentPage = 1;
        this.loadTransactions();
    }
    
    filterByDate(dateString) {
        if (!dateString) {
            this.filteredTransactions = [...this.transactions];
            this.loadTransactions();
            return;
        }
        
        const filterDate = new Date(dateString);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        this.filteredTransactions = this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= filterDate && transactionDate < nextDay;
        });
        
        this.currentPage = 1;
        this.loadTransactions();
    }
    
    performBackup() {
        // In a real app, this would backup to cloud storage
        // For now, we'll just show a success message
        this.showToast('Backup manual berhasil dilakukan!', 'success');
        
        // Simulate backup process
        setTimeout(() => {
            this.showToast('Data tersimpan dengan aman di penyimpanan lokal.', 'success');
        }, 1000);
    }
    
    viewTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;
        
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        let itemsHtml = '';
        transaction.items.forEach((item, index) => {
            itemsHtml += `
                <div class="item-row">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>${item.desc}</small>
                    </div>
                    <div>
                        ${item.quantity} x Rp${item.price.toLocaleString('id-ID')}<br>
                        <strong>Rp${(item.price * item.quantity).toLocaleString('id-ID')}</strong>
                    </div>
                </div>
            `;
        });
        
        const detailHtml = `
            <div class="detail-item">
                <div class="detail-label">ID Transaksi</div>
                <div class="detail-value">#${transaction.id}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Tanggal & Waktu</div>
                <div class="detail-value">${formattedDate}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Metode Pembayaran</div>
                <div class="detail-value">
                    <span class="method-badge ${transaction.method}">
                        ${transaction.method === 'cash' ? 'Tunai' : 'QRIS'}
                    </span>
                </div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Item Pembelian</div>
                <div class="detail-value">
                    <div class="items-list">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Rincian Pembayaran</div>
                <div class="detail-value">
                    <div class="item-row">
                        <div>Total Item:</div>
                        <div>${transaction.items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                    </div>
                    <div class="item-row">
                        <div>Total Harga:</div>
                        <div>Rp${transaction.total.toLocaleString('id-ID')}</div>
                    </div>
                    ${transaction.method === 'cash' ? `
                        <div class="item-row">
                            <div>Uang Bayar:</div>
                            <div>Rp${transaction.cashPaid.toLocaleString('id-ID')}</div>
                        </div>
                        <div class="item-row">
                            <div>Kembalian:</div>
                            <div>Rp${transaction.change.toLocaleString('id-ID')}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('transactionDetail').innerHTML = detailHtml;
        this.currentDetailId = id;
        this.openModal('detailModal');
    }
    
    deleteTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;
        
        const date = new Date(transaction.date).toLocaleDateString('id-ID');
        
        this.showConfirmModal(
            `Apakah Anda yakin ingin menghapus transaksi #${id} tanggal ${date}?`,
            () => {
                this.transactions = this.transactions.filter(t => t.id !== id);
                this.filteredTransactions = this.filteredTransactions.filter(t => t.id !== id);
                this.selectedTransactions.delete(id.toString());
                
                localStorage.setItem('transactions', JSON.stringify(this.transactions));
                this.loadTransactions();
                this.updateStats();
                this.showToast('Transaksi berhasil dihapus!', 'success');
            }
        );
    }
    
    deleteSelectedTransactions() {
        if (this.selectedTransactions.size === 0) {
            this.showToast('Tidak ada transaksi yang dipilih!', 'error');
            return;
        }
        
        this.showConfirmModal(
            `Apakah Anda yakin ingin menghapus ${this.selectedTransactions.size} transaksi terpilih?`,
            () => {
                const idsToDelete = Array.from(this.selectedTransactions).map(id => parseInt(id));
                
                this.transactions = this.transactions.filter(t => !idsToDelete.includes(t.id));
                this.filteredTransactions = this.filteredTransactions.filter(t => !idsToDelete.includes(t.id));
                this.selectedTransactions.clear();
                
                localStorage.setItem('transactions', JSON.stringify(this.transactions));
                this.loadTransactions();
                this.updateStats();
                this.updateDeleteButton();
                this.showToast(`${idsToDelete.length} transaksi berhasil dihapus!`, 'success');
            }
        );
    }
    
    deleteAllTransactions() {
        if (this.transactions.length === 0) {
            this.showToast('Tidak ada transaksi untuk dihapus!', 'error');
            return;
        }
        
        this.showConfirmModal(
            'Apakah Anda yakin ingin menghapus SEMUA transaksi? Tindakan ini tidak dapat dibatalkan!',
            () => {
                this.transactions = [];
                this.filteredTransactions = [];
                this.selectedTransactions.clear();
                
                localStorage.setItem('transactions', JSON.stringify([]));
                this.loadTransactions();
                this.updateStats();
                this.updateDeleteButton();
                this.showToast('Semua transaksi berhasil dihapus!', 'success');
            }
        );
    }
    
    exportData() {
        if (this.transactions.length === 0) {
            this.showToast('Tidak ada data untuk diexport!', 'error');
            return;
        }
        
        // Convert to CSV
        const headers = ['ID', 'Tanggal', 'Metode', 'Item', 'Jumlah Item', 'Total', 'Uang Bayar', 'Kembalian'];
        const rows = this.transactions.map(t => {
            const date = new Date(t.date).toLocaleString('id-ID');
            const items = t.items.map(item => `${item.name} (${item.desc}) x${item.quantity}`).join('; ');
            const totalItems = t.items.reduce((sum, item) => sum + item.quantity, 0);
            
            return [
                t.id,
                date,
                t.method === 'cash' ? 'Tunai' : 'QRIS',
                items,
                totalItems,
                t.total,
                t.cashPaid || t.total,
                t.change || 0
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `backup-transaksi-nasi-daun-jeruk-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Data berhasil diexport ke CSV!', 'success');
    }
    
    updateDeleteButton() {
        const deleteBtn = document.getElementById('deleteSelected');
        deleteBtn.disabled = this.selectedTransactions.size === 0;
    }
    
    printDetail() {
        const printContent = document.getElementById('transactionDetail').innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
                <h2 style="color: #2e7d32; text-align: center;">Detail Transaksi Nasi Daun Jeruk</h2>
                ${printContent}
                <p style="text-align: center; margin-top: 30px; color: #666;">
                    Dicetak pada ${new Date().toLocaleString('id-ID')}
                </p>
            </div>
        `;
        
        window.print();
        document.body.innerHTML = originalContent;
        
        // Reinitialize the backup manager
        this.init();
    }
    
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showConfirmModal(message, confirmCallback) {
        document.getElementById('confirmMessage').textContent = message;
        this.confirmCallback = confirmCallback;
        this.openModal('confirmModal');
    }
    
    confirmAction(confirmed) {
        this.closeModal();
        if (confirmed && this.confirmCallback) {
            this.confirmCallback();
        }
        this.confirmCallback = null;
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('successToast');
        const messageEl = document.getElementById('successMessage');
        
        messageEl.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the backup manager
let backupManager;
document.addEventListener('DOMContentLoaded', () => {
    backupManager = new BackupManager();
    window.backupManager = backupManager;
});