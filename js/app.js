// ===== APP CONFIGURATION =====
const CONFIG = {
    APP_NAME: 'Nasi Daun Jeruk POS',
    VERSION: '2.0',
    PRICES: {
        NASI: 10000,
        TOPPING: 2000,
        JERUK: 5000,
        TEH: 3000
    },
    STORAGE_KEY: 'nasiDaunJerukData_v2'
};

// ===== STATE MANAGEMENT =====
let state = {
    cart: {
        nasi: 0,
        toppingAyam: false,
        toppingKulit: false,
        jeruk: 0,
        teh: 0
    },
    transactions: [],
    dailyStats: {
        income: 0,
        count: 0,
        average: 0
    },
    settings: {
        darkMode: false,
        soundEnabled: true,
        autoBackup: true
    }
};

// ===== DOM ELEMENTS =====
const elements = {
    // Navigation
    posTab: document.getElementById('posTab'),
    backupTab: document.getElementById('backupTab'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    currentTime: document.getElementById('currentTime'),
    
    // Menu Items
    addNasi: document.getElementById('addNasi'),
    toppingAyam: document.getElementById('toppingAyam'),
    toppingKulit: document.getElementById('toppingKulit'),
    qtyJeruk: document.getElementById('qtyJeruk'),
    qtyTeh: document.getElementById('qtyTeh'),
    
    // Cart
    itemCount: document.getElementById('itemCount'),
    clearCart: document.getElementById('clearCart'),
    orderItems: document.getElementById('orderItems'),
    
    // Pricing
    nasiPrice: document.getElementById('nasiPrice'),
    toppingPrice: document.getElementById('toppingPrice'),
    drinkPrice: document.getElementById('drinkPrice'),
    finalTotal: document.getElementById('finalTotal'),
    toppingTotal: document.getElementById('toppingTotal'),
    
    // Payment
    cashInput: document.getElementById('cashInput'),
    changeDisplay: document.getElementById('changeDisplay'),
    changeAmount: document.getElementById('changeAmount'),
    errorMsg: document.getElementById('errorMsg'),
    processOrder: document.getElementById('processOrder'),
    printReceipt: document.getElementById('printReceipt'),
    
    // Quick Cash
    cashButtons: document.querySelectorAll('.cash-btn'),
    
    // Pages
    posPage: document.getElementById('posPage'),
    backupPage: document.getElementById('backupPage'),
    
    // Recent Transactions
    recentTransactions: document.getElementById('recentTransactions'),
    
    // Modals
    receiptModal: document.getElementById('receiptModal'),
    confirmModal: document.getElementById('confirmModal'),
    
    // Export
    exportExcel: document.getElementById('exportExcel')
};

// ===== UTILITY FUNCTIONS =====
const utils = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    formatDate: (date = new Date()) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    },
    
    generateId: () => {
        return 'TRX-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    },
    
    playSound: (type = 'click') => {
        if (!state.settings.soundEnabled) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(
            type === 'success' ? 800 : type === 'error' ? 400 : 600,
            audioContext.currentTime
        );
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    },
    
    showNotification: (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ===== CART MANAGEMENT =====
const cartManager = {
    updateCart: () => {
        // Calculate totals
        const nasiTotal = state.cart.nasi * CONFIG.PRICES.NASI;
        const toppingCount = (state.cart.toppingAyam ? 1 : 0) + (state.cart.toppingKulit ? 1 : 0);
        const toppingTotal = toppingCount * CONFIG.PRICES.TOPPING;
        const drinkTotal = (state.cart.jeruk * CONFIG.PRICES.JERUK) + (state.cart.teh * CONFIG.PRICES.TEH);
        
        const total = nasiTotal + toppingTotal + drinkTotal;
        
        // Update display
        elements.nasiPrice.textContent = utils.formatCurrency(nasiTotal);
        elements.toppingPrice.textContent = utils.formatCurrency(toppingTotal);
        elements.drinkPrice.textContent = utils.formatCurrency(drinkTotal);
        elements.finalTotal.textContent = utils.formatCurrency(total);
        elements.toppingTotal.textContent = utils.formatCurrency(toppingTotal);
        
        // Update item count
        const itemCount = state.cart.nasi + state.cart.jeruk + state.cart.teh;
        elements.itemCount.textContent = itemCount;
        
        // Update order items display
        cartManager.updateOrderItems();
        
        // Update payment validation
        paymentManager.validatePayment();
        
        // Save cart to localStorage
        localStorage.setItem('cartState', JSON.stringify(state.cart));
    },
    
    updateOrderItems: () => {
        elements.orderItems.innerHTML = '';
        
        if (state.cart.nasi === 0 && state.cart.jeruk === 0 && state.cart.teh === 0) {
            elements.orderItems.innerHTML = `
                <div class="empty-order">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Belum ada pesanan</p>
                    <small>Tambahkan item dari menu</small>
                </div>
            `;
            return;
        }
        
        // Add nasi item
        if (state.cart.nasi > 0) {
            const nasiItem = document.createElement('div');
            nasiItem.className = 'order-item';
            nasiItem.innerHTML = `
                <div class="order-item-name">Nasi Daun Jeruk</div>
                <div class="order-item-qty">${state.cart.nasi}x</div>
                <div class="order-item-price">${utils.formatCurrency(state.cart.nasi * CONFIG.PRICES.NASI)}</div>
                <button class="order-item-remove" data-item="nasi">
                    <i class="fas fa-times"></i>
                </button>
            `;
            elements.orderItems.appendChild(nasiItem);
        }
        
        // Add toppings
        if (state.cart.toppingAyam) {
            const toppingItem = document.createElement('div');
            toppingItem.className = 'order-item';
            toppingItem.innerHTML = `
                <div class="order-item-name">+ Ayam Suwir</div>
                <div class="order-item-qty">1x</div>
                <div class="order-item-price">${utils.formatCurrency(CONFIG.PRICES.TOPPING)}</div>
                <button class="order-item-remove" data-item="toppingAyam">
                    <i class="fas fa-times"></i>
                </button>
            `;
            elements.orderItems.appendChild(toppingItem);
        }
        
        if (state.cart.toppingKulit) {
            const toppingItem = document.createElement('div');
            toppingItem.className = 'order-item';
            toppingItem.innerHTML = `
                <div class="order-item-name">+ Kulit Ayam Crispy</div>
                <div class="order-item-qty">1x</div>
                <div class="order-item-price">${utils.formatCurrency(CONFIG.PRICES.TOPPING)}</div>
                <button class="order-item-remove" data-item="toppingKulit">
                    <i class="fas fa-times"></i>
                </button>
            `;
            elements.orderItems.appendChild(toppingItem);
        }
        
        // Add drinks
        if (state.cart.jeruk > 0) {
            const drinkItem = document.createElement('div');
            drinkItem.className = 'order-item';
            drinkItem.innerHTML = `
                <div class="order-item-name">Es Jeruk Peras</div>
                <div class="order-item-qty">${state.cart.jeruk}x</div>
                <div class="order-item-price">${utils.formatCurrency(state.cart.jeruk * CONFIG.PRICES.JERUK)}</div>
                <button class="order-item-remove" data-item="jeruk">
                    <i class="fas fa-times"></i>
                </button>
            `;
            elements.orderItems.appendChild(drinkItem);
        }
        
        if (state.cart.teh > 0) {
            const drinkItem = document.createElement('div');
            drinkItem.className = 'order-item';
            drinkItem.innerHTML = `
                <div class="order-item-name">Teh Es Manis</div>
                <div class="order-item-qty">${state.cart.teh}x</div>
                <div class="order-item-price">${utils.formatCurrency(state.cart.teh * CONFIG.PRICES.TEH)}</div>
                <button class="order-item-remove" data-item="teh">
                    <i class="fas fa-times"></i>
                </button>
            `;
            elements.orderItems.appendChild(drinkItem);
        }
        
        // Add remove event listeners
        document.querySelectorAll('.order-item-remove').forEach(button => {
            button.addEventListener('click', function() {
                const item = this.dataset.item;
                cartManager.removeItem(item);
            });
        });
    },
    
    addItem: (item, quantity = 1) => {
        if (item === 'nasi') {
            state.cart.nasi += quantity;
        } else if (item === 'jeruk') {
            state.cart.jeruk += quantity;
        } else if (item === 'teh') {
            state.cart.teh += quantity;
        } else if (item === 'toppingAyam') {
            state.cart.toppingAyam = !state.cart.toppingAyam;
            elements.toppingAyam.checked = state.cart.toppingAyam;
        } else if (item === 'toppingKulit') {
            state.cart.toppingKulit = !state.cart.toppingKulit;
            elements.toppingKulit.checked = state.cart.toppingKulit;
        }
        
        cartManager.updateCart();
        utils.playSound('success');
    },
    
    removeItem: (item) => {
        if (item === 'nasi') {
            state.cart.nasi = Math.max(0, state.cart.nasi - 1);
        } else if (item === 'jeruk') {
            state.cart.jeruk = Math.max(0, state.cart.jeruk - 1);
        } else if (item === 'teh') {
            state.cart.teh = Math.max(0, state.cart.teh - 1);
        } else if (item === 'toppingAyam') {
            state.cart.toppingAyam = false;
            elements.toppingAyam.checked = false;
        } else if (item === 'toppingKulit') {
            state.cart.toppingKulit = false;
            elements.toppingKulit.checked = false;
        }
        
        cartManager.updateCart();
        utils.playSound();
    },
    
    clearCart: () => {
        if (Object.values(state.cart).some(val => val > 0 || val === true)) {
            if (confirm('Kosongkan keranjang belanja?')) {
                state.cart = {
                    nasi: 0,
                    toppingAyam: false,
                    toppingKulit: false,
                    jeruk: 0,
                    teh: 0
                };
                
                elements.toppingAyam.checked = false;
                elements.toppingKulit.checked = false;
                elements.cashInput.value = '';
                
                cartManager.updateCart();
                utils.showNotification('Keranjang berhasil dikosongkan', 'success');
            }
        }
    },
    
    getTotal: () => {
        const nasiTotal = state.cart.nasi * CONFIG.PRICES.NASI;
        const toppingCount = (state.cart.toppingAyam ? 1 : 0) + (state.cart.toppingKulit ? 1 : 0);
        const toppingTotal = toppingCount * CONFIG.PRICES.TOPPING;
        const drinkTotal = (state.cart.jeruk * CONFIG.PRICES.JERUK) + (state.cart.teh * CONFIG.PRICES.TEH);
        
        return nasiTotal + toppingTotal + drinkTotal;
    }
};

// ===== PAYMENT MANAGEMENT =====
const paymentManager = {
    validatePayment: () => {
        const cash = parseFloat(elements.cashInput.value) || 0;
        const total = cartManager.getTotal();
        
        if (cash >= total && total > 0) {
            const change = cash - total;
            elements.changeAmount.textContent = utils.formatCurrency(change);
            elements.changeDisplay.style.display = 'block';
            elements.errorMsg.style.display = 'none';
            elements.processOrder.disabled = false;
            utils.playSound('success');
        } else {
            elements.changeDisplay.style.display = 'none';
            elements.processOrder.disabled = true;
            
            if (cash > 0 && cash < total) {
                elements.errorMsg.style.display = 'block';
                utils.playSound('error');
            } else {
                elements.errorMsg.style.display = 'none';
            }
        }
    },
    
    processPayment: () => {
        const cash = parseFloat(elements.cashInput.value) || 0;
        const total = cartManager.getTotal();
        
        if (cash < total || total === 0) {
            utils.showNotification('Uang pembayaran kurang!', 'error');
            return false;
        }
        
        // Create transaction record
        const transaction = {
            id: utils.generateId(),
            date: new Date().toISOString(),
            items: {
                nasi: state.cart.nasi,
                toppingAyam: state.cart.toppingAyam,
                toppingKulit: state.cart.toppingKulit,
                jeruk: state.cart.jeruk,
                teh: state.cart.teh
            },
            total: total,
            payment: cash,
            change: cash - total
        };
        
        // Add to transactions
        state.transactions.unshift(transaction);
        
        // Update daily stats
        const today = new Date().toDateString();
        const todayTransactions = state.transactions.filter(t => 
            new Date(t.date).toDateString() === today
        );
        
        state.dailyStats.income = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        state.dailyStats.count = todayTransactions.length;
        state.dailyStats.average = state.dailyStats.count > 0 ? 
            state.dailyStats.income / state.dailyStats.count : 0;
        
        // Save to localStorage
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
            transactions: state.transactions,
            dailyStats: state.dailyStats,
            settings: state.settings
        }));
        
        // Show receipt
        receiptManager.showReceipt(transaction);
        
        // Clear cart
        state.cart = {
            nasi: 0,
            toppingAyam: false,
            toppingKulit: false,
            jeruk: 0,
            teh: 0
        };
        
        elements.toppingAyam.checked = false;
        elements.toppingKulit.checked = false;
        elements.cashInput.value = '';
        
        cartManager.updateCart();
        
        // Update recent transactions
        transactionManager.updateRecentTransactions();
        
        utils.showNotification('Transaksi berhasil diproses!', 'success');
        return true;
    },
    
    setQuickCash: (amount) => {
        elements.cashInput.value = amount;
        paymentManager.validatePayment();
        utils.playSound();
    }
};

// ===== RECEIPT MANAGEMENT =====
const receiptManager = {
    showReceipt: (transaction) => {
        // Update receipt content
        document.getElementById('receiptId').textContent = transaction.id;
        document.getElementById('receiptDate').textContent = utils.formatDate(new Date(transaction.date));
        document.getElementById('receiptCashier').textContent = 'Kasir: Admin';
        document.getElementById('receiptTotal').textContent = utils.formatCurrency(transaction.total);
        document.getElementById('receiptCash').textContent = utils.formatCurrency(transaction.payment);
        document.getElementById('receiptChange').textContent = utils.formatCurrency(transaction.change);
        
        // Update receipt items
        const receiptItems = document.getElementById('receiptItems');
        receiptItems.innerHTML = '';
        
        // Add nasi
        if (transaction.items.nasi > 0) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <span>Nasi Daun Jeruk ×${transaction.items.nasi}</span>
                <span>${utils.formatCurrency(transaction.items.nasi * CONFIG.PRICES.NASI)}</span>
            `;
            receiptItems.appendChild(itemDiv);
        }
        
        // Add toppings
        if (transaction.items.toppingAyam) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <span>+ Ayam Suwir</span>
                <span>${utils.formatCurrency(CONFIG.PRICES.TOPPING)}</span>
            `;
            receiptItems.appendChild(itemDiv);
        }
        
        if (transaction.items.toppingKulit) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <span>+ Kulit Ayam Crispy</span>
                <span>${utils.formatCurrency(CONFIG.PRICES.TOPPING)}</span>
            `;
            receiptItems.appendChild(itemDiv);
        }
        
        // Add drinks
        if (transaction.items.jeruk > 0) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <span>Es Jeruk Peras ×${transaction.items.jeruk}</span>
                <span>${utils.formatCurrency(transaction.items.jeruk * CONFIG.PRICES.JERUK)}</span>
            `;
            receiptItems.appendChild(itemDiv);
        }
        
        if (transaction.items.teh > 0) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <span>Teh Es Manis ×${transaction.items.teh}</span>
                <span>${utils.formatCurrency(transaction.items.teh * CONFIG.PRICES.TEH)}</span>
            `;
            receiptItems.appendChild(itemDiv);
        }
        
        // Show modal
        elements.receiptModal.style.display = 'flex';
    },
    
    printReceipt: () => {
        const printContent = document.querySelector('.receipt-content').cloneNode(true);
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Struk Nasi Daun Jeruk</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        font-size: 12px; 
                        padding: 10px;
                        max-width: 300px;
                        margin: 0 auto;
                    }
                    .receipt-header { text-align: center; margin-bottom: 15px; }
                    .receipt-header h3 { margin: 5px 0; }
                    .receipt-item { display: flex; justify-content: space-between; margin: 3px 0; }
                    .receipt-total { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
                    .total-row { display: flex; justify-content: space-between; margin: 2px 0; }
                    .change { font-weight: bold; }
                    .receipt-footer { text-align: center; margin-top: 15px; font-size: 10px; }
                    @media print { 
                        body { margin: 0; padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
};

// ===== TRANSACTION MANAGEMENT =====
const transactionManager = {
    updateRecentTransactions: () => {
        const recent = state.transactions.slice(0, 5); // Get 5 most recent
        elements.recentTransactions.innerHTML = '';
        
        if (recent.length === 0) {
            elements.recentTransactions.innerHTML = `
                <div class="no-transactions">
                    Belum ada transaksi hari ini
                </div>
            `;
            return;
        }
        
        recent.forEach(transaction => {
            const card = document.createElement('div');
            card.className = 'transaction-card';
            card.innerHTML = `
                <div class="transaction-header">
                    <div class="transaction-id">${transaction.id}</div>
                    <div class="transaction-time">${utils.formatDate(new Date(transaction.date))}</div>
                </div>
                <div class="transaction-total">${utils.formatCurrency(transaction.total)}</div>
            `;
            elements.recentTransactions.appendChild(card);
        });
    },
    
    exportToExcel: () => {
        if (state.transactions.length === 0) {
            utils.showNotification('Tidak ada data untuk diexport', 'error');
            return;
        }
        
        // Create CSV content
        let csv = 'ID,Tanggal,Nasi,Topping Ayam,Topping Kulit,Jeruk,Teh,Total,Bayar,Kembalian\n';
        
        state.transactions.forEach(transaction => {
            csv += `"${transaction.id}","${utils.formatDate(new Date(transaction.date))}",`;
            csv += `${transaction.items.nasi},`;
            csv += `${transaction.items.toppingAyam ? 'Ya' : 'Tidak'},`;
            csv += `${transaction.items.toppingKulit ? 'Ya' : 'Tidak'},`;
            csv += `${transaction.items.jeruk},`;
            csv += `${transaction.items.teh},`;
            csv += `${transaction.total},`;
            csv += `${transaction.payment},`;
            csv += `${transaction.change}\n`;
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `transaksi_nasi_daun_jeruk_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        utils.showNotification('Data berhasil diexport ke CSV', 'success');
    }
};

// ===== SETTINGS MANAGEMENT =====
const settingsManager = {
    toggleDarkMode: () => {
        state.settings.darkMode = !state.settings.darkMode;
        
        if (state.settings.darkMode) {
            document.body.classList.add('dark-mode');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            utils.showNotification('Mode gelap diaktifkan', 'info');
        } else {
            document.body.classList.remove('dark-mode');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            utils.showNotification('Mode terang diaktifkan', 'info');
        }
        
        localStorage.setItem('appSettings', JSON.stringify(state.settings));
    },
    
    loadSettings: () => {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
            
            if (state.settings.darkMode) {
                document.body.classList.add('dark-mode');
                elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
    }
};

// ===== INITIALIZATION =====
const init = () => {
    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized`);
    
    // Load saved state
    const savedData = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (savedData) {
        const data = JSON.parse(savedData);
        state.transactions = data.transactions || [];
        state.dailyStats = data.dailyStats || state.dailyStats;
    }
    
    // Load cart state
    const savedCart = localStorage.getItem('cartState');
    if (savedCart) {
        state.cart = JSON.parse(savedCart);
        elements.toppingAyam.checked = state.cart.toppingAyam;
        elements.toppingKulit.checked = state.cart.toppingKulit;
    }
    
    // Load settings
    settingsManager.loadSettings();
    
    // Initialize cart
    cartManager.updateCart();
    
    // Initialize recent transactions
    transactionManager.updateRecentTransactions();
    
    // Update time display
    const updateTime = () => {
        const now = new Date();
        elements.currentTime.textContent = now.toLocaleTimeString('id-ID');
    };
    updateTime();
    setInterval(updateTime, 1000);
    
    // ===== EVENT LISTENERS =====
    
    // Navigation
    elements.posTab.addEventListener('click', () => {
        elements.posTab.classList.add('active');
        elements.backupTab.classList.remove('active');
        elements.posPage.classList.add('active');
        elements.backupPage.classList.remove('active');
    });
    
    elements.backupTab.addEventListener('click', () => {
        elements.backupTab.classList.add('active');
        elements.posTab.classList.remove('active');
        elements.backupPage.classList.add('active');
        elements.posPage.classList.remove('active');
    });
    
    elements.darkModeToggle.addEventListener('click', settingsManager.toggleDarkMode);
    
    // Menu Actions
    elements.addNasi.addEventListener('click', () => cartManager.addItem('nasi'));
    
    elements.toppingAyam.addEventListener('change', () => cartManager.addItem('toppingAyam'));
    elements.toppingKulit.addEventListener('change', () => cartManager.addItem('toppingKulit'));
    
    // Drink quantity buttons
    document.querySelectorAll('.qty-btn.plus[data-drink="jeruk"]').forEach(btn => {
        btn.addEventListener('click', () => cartManager.addItem('jeruk'));
    });
    
    document.querySelectorAll('.qty-btn.minus[data-drink="jeruk"]').forEach(btn => {
        btn.addEventListener('click', () => cartManager.removeItem('jeruk'));
    });
    
    document.querySelectorAll('.qty-btn.plus[data-drink="teh"]').forEach(btn => {
        btn.addEventListener('click', () => cartManager.addItem('teh'));
    });
    
    document.querySelectorAll('.qty-btn.minus[data-drink="teh"]').forEach(btn => {
        btn.addEventListener('click', () => cartManager.removeItem('teh'));
    });
    
    // Cart Actions
    elements.clearCart.addEventListener('click', cartManager.clearCart);
    
    // Payment Actions
    elements.cashInput.addEventListener('input', utils.debounce(() => {
        paymentManager.validatePayment();
    }, 300));
    
    elements.processOrder.addEventListener('click', () => {
        if (paymentManager.processPayment()) {
            elements.printReceipt.disabled = false;
        }
    });
    
    elements.printReceipt.addEventListener('click', () => {
        receiptManager.printReceipt();
    });
    
    // Quick Cash Buttons
    elements.cashButtons.forEach(button => {
        button.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            paymentManager.setQuickCash(amount);
        });
    });
    
    // Export
    elements.exportExcel.addEventListener('click', transactionManager.exportToExcel);
    
    // Modal Close Buttons
    document.getElementById('closeReceipt').addEventListener('click', () => {
        elements.receiptModal.style.display = 'none';
    });
    
    document.getElementById('printReceiptBtn').addEventListener('click', receiptManager.printReceipt);
    
    document.getElementById('confirmCancel').addEventListener('click', () => {
        elements.confirmModal.style.display = 'none';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === elements.receiptModal) {
            elements.receiptModal.style.display = 'none';
        }
        if (event.target === elements.confirmModal) {
            elements.confirmModal.style.display = 'none';
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // F1 - Help
        if (event.key === 'F1') {
            event.preventDefault();
            alert('Shortcuts:\nF1 - Bantuan ini\nF2 - Mode Kasir\nF3 - Mode Laporan\nF5 - Refresh\nF12 - Developer Tools');
        }
        
        // F2 - POS Mode
        if (event.key === 'F2') {
            event.preventDefault();
            elements.posTab.click();
        }
        
        // F3 - Backup Mode
        if (event.key === 'F3') {
            event.preventDefault();
            elements.backupTab.click();
        }
        
        // Escape - Close modals
        if (event.key === 'Escape') {
            elements.receiptModal.style.display = 'none';
            elements.confirmModal.style.display = 'none';
        }
        
        // Ctrl + P - Print receipt
        if (event.ctrlKey && event.key === 'p') {
            event.preventDefault();
            receiptManager.printReceipt();
        }
        
        // Ctrl + S - Save/Process
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            elements.processOrder.click();
        }
        
        // Ctrl + D - Dark mode
        if (event.ctrlKey && event.key === 'd') {
            event.preventDefault();
            settingsManager.toggleDarkMode();
        }
    });
    
    // Service Worker for PWA (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
    
    // Show welcome message
    setTimeout(() => {
        utils.showNotification(`${CONFIG.APP_NAME} v${CONFIG.VERSION} siap digunakan!`, 'success');
    }, 1000);
};

// ===== START APPLICATION =====
document.addEventListener('DOMContentLoaded', init);

// ===== GLOBAL EXPORTS (for debugging) =====
window.App = {
    config: CONFIG,
    state: state,
    utils: utils,
    cart: cartManager,
    payment: paymentManager,
    receipt: receiptManager,
    transactions: transactionManager,
    settings: settingsManager
};

console.log('Nasi Daun Jeruk POS System loaded successfully!');
