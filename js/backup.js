// Backup and reporting functionality
// This file handles data backup, export, and reporting

const backupManager = {
    // Backup data to localStorage
    backupData: () => {
        const backup = {
            transactions: state.transactions,
            dailyStats: state.dailyStats,
            timestamp: new Date().toISOString(),
            appVersion: CONFIG.VERSION
        };
        
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(backup));
        console.log('Data backed up successfully');
        
        return backup;
    },
    
    // Restore data from localStorage
    restoreData: () => {
        const backup = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (backup) {
            try {
                const data = JSON.parse(backup);
                state.transactions = data.transactions || [];
                state.dailyStats = data.dailyStats || state.dailyStats;
                
                console.log('Data restored successfully');
                return true;
            } catch (error) {
                console.error('Failed to restore data:', error);
                return false;
            }
        }
        return false;
    },
    
    // Export data to JSON file
    exportToJSON: () => {
        const data = {
            transactions: state.transactions,
            dailyStats: state.dailyStats,
            exportDate: new Date().toISOString(),
            app: CONFIG.APP_NAME,
            version: CONFIG.VERSION
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `backup_nasi_daun_jeruk_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        utils.showNotification('Backup JSON berhasil diexport', 'success');
    },
    
    // Import data from JSON file
    importFromJSON: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (!data.transactions || !Array.isArray(data.transactions)) {
                        throw new Error('Format data tidak valid');
                    }
                    
                    // Merge with existing data (optional: confirm with user)
                    state.transactions = [...data.transactions, ...state.transactions];
                    backupManager.backupData();
                    
                    utils.showNotification('Data berhasil diimport', 'success');
                    resolve(true);
                } catch (error) {
                    utils.showNotification('Gagal mengimport data: ' + error.message, 'error');
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                utils.showNotification('Gagal membaca file', 'error');
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    },
    
    // Generate reports
    generateReports: {
        // Daily report
        daily: (date = new Date()) => {
            const targetDate = date.toDateString();
            const dailyTransactions = state.transactions.filter(t => 
                new Date(t.date).toDateString() === targetDate
            );
            
            const totals = dailyTransactions.reduce((acc, t) => {
                acc.total += t.total;
                acc.nasi += t.items.nasi;
                acc.toppings += (t.items.toppingAyam ? 1 : 0) + (t.items.toppingKulit ? 1 : 0);
                acc.drinks += t.items.jeruk + t.items.teh;
                return acc;
            }, { total: 0, nasi: 0, toppings: 0, drinks: 0 });
            
            return {
                date: targetDate,
                transactionCount: dailyTransactions.length,
                totals: totals,
                transactions: dailyTransactions,
                averageOrder: dailyTransactions.length > 0 ? totals.total / dailyTransactions.length : 0
            };
        },
        
        // Weekly report
        weekly: (startDate = new Date()) => {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() - 7);
            
            const weeklyTransactions = state.transactions.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= endDate && transDate <= startDate;
            });
            
            // Group by day
            const byDay = {};
            weeklyTransactions.forEach(t => {
                const day = new Date(t.date).toDateString();
                if (!byDay[day]) {
                    byDay[day] = {
                        transactions: [],
                        total: 0,
                        count: 0
                    };
                }
                byDay[day].transactions.push(t);
                byDay[day].total += t.total;
                byDay[day].count++;
            });
            
            const totals = weeklyTransactions.reduce((acc, t) => {
                acc.total += t.total;
                acc.nasi += t.items.nasi;
                acc.toppings += (t.items.toppingAyam ? 1 : 0) + (t.items.toppingKulit ? 1 : 0);
                acc.drinks += t.items.jeruk + t.items.teh;
                return acc;
            }, { total: 0, nasi: 0, toppings: 0, drinks: 0 });
            
            return {
                period: `${endDate.toLocaleDateString()} - ${startDate.toLocaleDateString()}`,
                transactionCount: weeklyTransactions.length,
                totals: totals,
                byDay: byDay,
                averageDaily: Object.keys(byDay).length > 0 ? 
                    totals.total / Object.keys(byDay).length : 0
            };
        },
        
        // Monthly report
        monthly: (month = new Date().getMonth(), year = new Date().getFullYear()) => {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            const monthlyTransactions = state.transactions.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= startDate && transDate <= endDate;
            });
            
            // Group by day
            const byDay = {};
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toDateString();
                byDay[dayStr] = {
                    transactions: [],
                    total: 0,
                    count: 0
                };
            }
            
            monthlyTransactions.forEach(t => {
                const day = new Date(t.date).toDateString();
                if (byDay[day]) {
                    byDay[day].transactions.push(t);
                    byDay[day].total += t.total;
                    byDay[day].count++;
                }
            });
            
            const totals = monthlyTransactions.reduce((acc, t) => {
                acc.total += t.total;
                acc.nasi += t.items.nasi;
                acc.toppings += (t.items.toppingAyam ? 1 : 0) + (t.items.toppingKulit ? 1 : 0);
                acc.drinks += t.items.jeruk + t.items.teh;
                return acc;
            }, { total: 0, nasi: 0, toppings: 0, drinks: 0 });
            
            return {
                month: startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                transactionCount: monthlyTransactions.length,
                totals: totals,
                byDay: byDay,
                averageDaily: Object.keys(byDay).length > 0 ? 
                    totals.total / Object.keys(byDay).length : 0,
                bestDay: Object.entries(byDay).reduce((best, [day, data]) => 
                    data.total > best.total ? { day, ...data } : best, 
                    { day: '', total: 0 }
                )
            };
        }
    },
    
    // Clear all data with confirmation
    clearAllData: () => {
        return new Promise((resolve) => {
            if (state.transactions.length === 0) {
                utils.showNotification('Tidak ada data untuk dihapus', 'info');
                resolve(false);
                return;
            }
            
            const confirmed = confirm(
                `Apakah Anda yakin ingin menghapus SEMUA data?\n\n` +
                `Aksi ini akan menghapus ${state.transactions.length} transaksi ` +
                `dan tidak dapat dibatalkan.`
            );
            
            if (confirmed) {
                state.transactions = [];
                state.dailyStats = { income: 0, count: 0, average: 0 };
                localStorage.removeItem(CONFIG.STORAGE_KEY);
                
                utils.showNotification('Semua data berhasil dihapus', 'success');
                
                // Update UI
                transactionManager.updateRecentTransactions();
                
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },
    
    // Get statistics
    getStatistics: () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dailyReport = backupManager.generateReports.daily(today);
        const yesterdayReport = backupManager.generateReports.daily(yesterday);
        const weeklyReport = backupManager.generateReports.weekly(today);
        const monthlyReport = backupManager.generateReports.monthly();
        
        // Calculate growth
        const growth = yesterdayReport.transactionCount > 0 ?
            ((dailyReport.transactionCount - yesterdayReport.transactionCount) / yesterdayReport.transactionCount) * 100 : 0;
        
        // Most popular items
        const itemCounts = {
            nasi: 0,
            ayam: 0,
            kulit: 0,
            jeruk: 0,
            teh: 0
        };
        
        state.transactions.forEach(t => {
            itemCounts.nasi += t.items.nasi;
            itemCounts.ayam += t.items.toppingAyam ? 1 : 0;
            itemCounts.kulit += t.items.toppingKulit ? 1 : 0;
            itemCounts.jeruk += t.items.jeruk;
            itemCounts.teh += t.items.teh;
        });
        
        const mostPopular = Object.entries(itemCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        return {
            overview: {
                totalTransactions: state.transactions.length,
                totalRevenue: state.transactions.reduce((sum, t) => sum + t.total, 0),
                averageOrder: state.transactions.length > 0 ?
                    state.transactions.reduce((sum, t) => sum + t.total, 0) / state.transactions.length : 0
            },
            today: dailyReport,
            yesterday: yesterdayReport,
            growth: growth.toFixed(1),
            weekly: weeklyReport,
            monthly: monthlyReport,
            popularItems: {
                mostPopular: {
                    name: this.getItemName(mostPopular[0]),
                    count: mostPopular[1]
                },
                counts: itemCounts
            }
        };
    },
    
    // Helper to get item name
    getItemName: (key) => {
        const names = {
            nasi: 'Nasi Daun Jeruk',
            ayam: 'Ayam Suwir',
            kulit: 'Kulit Ayam Crispy',
            jeruk: 'Es Jeruk Peras',
            teh: 'Teh Es Manis'
        };
        return names[key] || key;
    },
    
    // Initialize backup features
    init: () => {
        console.log('Backup manager initialized');
        
        // Auto-backup every 5 minutes
        if (state.settings.autoBackup) {
            setInterval(() => {
                backupManager.backupData();
                console.log('Auto-backup completed');
            }, 5 * 60 * 1000); // 5 minutes
        }
        
        // Initialize UI components
        backupManager.initUI();
    },
    
    // Initialize UI components
    initUI: () => {
        // Date filter
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.value = new Date().toISOString().split('T')[0];
            
            dateFilter.addEventListener('change', function() {
                backupManager.filterTransactions();
            });
        }
        
        // Search filter
        const searchFilter = document.getElementById('searchFilter');
        if (searchFilter) {
            searchFilter.addEventListener('input', utils.debounce(() => {
                backupManager.filterTransactions();
            }, 300));
        }
        
        // Clear filters button
        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                if (dateFilter) dateFilter.value = new Date().toISOString().split('T')[0];
                if (searchFilter) searchFilter.value = '';
                backupManager.filterTransactions();
            });
        }
        
        // Delete all button
        const deleteAllBtn = document.getElementById('deleteAll');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', async () => {
                const confirmed = await backupManager.showConfirmDialog(
                    'Hapus Semua Data',
                    'Apakah Anda yakin ingin menghapus semua data transaksi? Tindakan ini tidak dapat dibatalkan.',
                    'danger'
                );
                
                if (confirmed) {
                    const success = await backupManager.clearAllData();
                    if (success) {
                        backupManager.loadTransactionsTable();
                    }
                }
            });
        }
        
        // Print report button
        const printReportBtn = document.getElementById('printReport');
        if (printReportBtn) {
            printReportBtn.addEventListener('click', () => {
                backupManager.printReport();
            });
        }
        
        // Load initial data
        backupManager.loadTransactionsTable();
    },
    
    // Filter transactions
    filterTransactions: () => {
        const dateFilter = document.getElementById('dateFilter');
        const searchFilter = document.getElementById('searchFilter');
        
        let filtered = state.transactions;
        
        // Filter by date
        if (dateFilter && dateFilter.value) {
            const selectedDate = new Date(dateFilter.value).toDateString();
            filtered = filtered.filter(t => 
                new Date(t.date).toDateString() === selectedDate
            );
        }
        
        // Filter by search term
        if (searchFilter && searchFilter.value.trim()) {
            const searchTerm = searchFilter.value.trim().toLowerCase();
            filtered = filtered.filter(t => 
                t.id.toLowerCase().includes(searchTerm) ||
                JSON.stringify(t.items).toLowerCase().includes(searchTerm) ||
                t.total.toString().includes(searchTerm)
            );
        }
        
        backupManager.updateTransactionsTable(filtered);
    },
    
    // Load transactions table
    loadTransactionsTable: () => {
        backupManager.updateTransactionsTable(state.transactions);
    },
    
    // Update transactions table
    updateTransactionsTable: (transactions) => {
        const tableBody = document.getElementById('transactionsBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (transactions.length === 0) {
            tableBody.innerHTML = `
                <tr class="no-data">
                    <td colspan="8">
                        <i class="fas fa-database"></i>
                        <p>Tidak ada data transaksi</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        transactions.forEach((transaction, index) => {
            const row = document.createElement('tr');
            row.dataset.id = transaction.id;
            
            // Format items string
            const items = [];
            if (transaction.items.nasi > 0) {
                items.push(`Nasi ×${transaction.items.nasi}`);
            }
            if (transaction.items.toppingAyam) {
                items.push('Ayam Suwir');
            }
            if (transaction.items.toppingKulit) {
                items.push('Kulit Crispy');
            }
            if (transaction.items.jeruk > 0) {
                items.push(`Jeruk ×${transaction.items.jeruk}`);
            }
            if (transaction.items.teh > 0) {
                items.push(`Teh ×${transaction.items.teh}`);
            }
            
            // Format toppings
            const toppings = [];
            if (transaction.items.toppingAyam) toppings.push('Ayam');
            if (transaction.items.toppingKulit) toppings.push('Kulit');
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="select-transaction" data-id="${transaction.id}">
                </td>
                <td>${transaction.id}</td>
                <td>${utils.formatDate(new Date(transaction.date))}</td>
                <td>${items.join(', ')}</td>
                <td>${toppings.join(', ') || '-'}</td>
                <td>${transaction.items.jeruk + transaction.items.teh}</td>
                <td>${utils.formatCurrency(transaction.total)}</td>
                <td>
                    <button class="btn-small btn-outline delete-transaction" data-id="${transaction.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-transaction').forEach(btn => {
            btn.addEventListener('click', async function() {
                const transactionId = this.dataset.id;
                const transaction = transactions.find(t => t.id === transactionId);
                
                if (transaction) {
                    const confirmed = await backupManager.showConfirmDialog(
                        'Hapus Transaksi',
                        `Hapus transaksi ${transactionId} senilai ${utils.formatCurrency(transaction.total)}?`,
                        'danger'
                    );
                    
                    if (confirmed) {
                        state.transactions = state.transactions.filter(t => t.id !== transactionId);
                        backupManager.backupData();
                        backupManager.filterTransactions();
                        utils.showNotification('Transaksi berhasil dihapus', 'success');
                    }
                }
            });
        });
        
        // Add event listeners to checkboxes
        document.querySelectorAll('.select-transaction').forEach(checkbox => {
            checkbox.addEventListener('change', backupManager.updateSelectedCount);
        });
        
        // Update select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.select-transaction');
                checkboxes.forEach(cb => {
                    cb.checked = this.checked;
                });
                backupManager.updateSelectedCount();
            });
        }
    },
    
    // Update selected transaction count
    updateSelectedCount: () => {
        const selected = document.querySelectorAll('.select-transaction:checked');
        const deleteSelectedBtn = document.getElementById('deleteSelected');
        
        if (deleteSelectedBtn) {
            deleteSelectedBtn.disabled = selected.length === 0;
        }
    },
    
    // Show confirmation dialog
    showConfirmDialog: (title, message, type = 'warning') => {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const titleEl = document.getElementById('confirmTitle');
            const messageEl = document.getElementById('confirmMessage');
            const confirmBtn = document.getElementById('confirmDelete');
            const cancelBtn = document.getElementById('confirmCancel');
            
            if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
                resolve(false);
                return;
            }
            
            // Set content
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            // Set button style based on type
            confirmBtn.className = `btn-${type}`;
            
            // Show modal
            modal.style.display = 'flex';
            
            // Handle confirm
            const handleConfirm = () => {
                modal.style.display = 'none';
                resolve(true);
                cleanup();
            };
            
            // Handle cancel
            const handleCancel = () => {
                modal.style.display = 'none';
                resolve(false);
                cleanup();
            };
            
            // Cleanup event listeners
            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };
            
            // Add event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
        });
    },
    
    // Print report
    printReport: () => {
        const stats = backupManager.getStatistics();
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laporan Nasi Daun Jeruk</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1, h2, h3 { color: #2E7D32; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; }
                    .stat-card { 
                        background: #f9f9f9; 
                        border-left: 4px solid #2E7D32;
                        padding: 15px;
                        margin-bottom: 15px;
                    }
                    .highlight { font-weight: bold; color: #2E7D32; }
                    @media print {
                        body { font-size: 12px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>NASI DAUN JERUK</h1>
                    <h2>Laporan Penjualan</h2>
                    <p>Tanggal: ${utils.formatDate(new Date())}</p>
                </div>
                
                <div class="section">
                    <h3>Ringkasan Keseluruhan</h3>
                    <div class="stat-card">
                        <p>Total Transaksi: <span class="highlight">${stats.overview.totalTransactions}</span></p>
                        <p>Total Pendapatan: <span class="highlight">${utils.formatCurrency(stats.overview.totalRevenue)}</span></p>
                        <p>Rata-rata Pesanan: <span class="highlight">${utils.formatCurrency(stats.overview.averageOrder)}</span></p>
                    </div>
                </div>
                
                <div class="section">
                    <h3>Hari Ini</h3>
                    <table>
                        <tr>
                            <th>Jumlah Transaksi</th>
                            <th>Total Pendapatan</th>
                            <th>Rata-rata</th>
                            <th>Pertumbuhan</th>
                        </tr>
                        <tr>
                            <td>${stats.today.transactionCount}</td>
                            <td>${utils.formatCurrency(stats.today.totals.total)}</td>
                            <td>${utils.formatCurrency(stats.today.averageOrder)}</td>
                            <td>${stats.growth}%</td>
                        </tr>
                    </table>
                </div>
                
                <div class="section">
                    <h3>Item Terpopuler</h3>
                    <p>${stats.popularItems.mostPopular.name}: ${stats.popularItems.mostPopular.count} kali</p>
                </div>
                
                <div class="section no-print">
                    <p><em>Dicetak pada: ${new Date().toLocaleString('id-ID')}</em></p>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
};

// Add to global App object
window.App.backup = backupManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', backupManager.init);
