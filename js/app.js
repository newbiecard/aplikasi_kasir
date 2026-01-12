// ===== NASI DAUN JERUK POS v3 - MAIN APP =====

// Configuration
const CONFIG = {
    APP_NAME: 'Nasi Daun Jeruk POS',
    VERSION: '3.0',
    STORAGE_KEY: 'nasiDaunJeruk_v3',
    
    // Harga Menu
    PRICES: {
        REGULAR: 10000,      // Nasi + 1 topping
        PREMIUM: 12000,      // Nasi + 2 topping
        JERUK: 5000,         // Es jeruk satuan
        PAKET: 13000         // Nasi + 1 topping + Es jeruk (hemat)
    },
    
    // Waktu timeout untuk simulasi pembayaran QRIS (ms)
    QRIS_TIMEOUT: 30000,
    
    // Default settings
    DEFAULT_SETTINGS: {
        darkMode: false,
        soundEnabled: true,
        autoBackup: true,
        qrisEnabled: true,
        receiptPrinter: false
    }
};

// State Management
let state = {
    cart: {
        items: [],
        total: 0,
        discount: 0,
        finalTotal: 0
    },
    transactions: [],
    settings: CONFIG.DEFAULT_SETTINGS,
    reports: {
        dailyIncome: 0,
        totalTransactions: 0,
        qrisTransactions: 0,
        averageOrder: 0
    },
    currentPage: 1,
    itemsPerPage: 10
};

// DOM Elements
const elements = {
    // Navigation
    posTab: document.getElementById('posTab'),
    backupTab: document.getElementById('backupTab'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    currentTime: document.getElementById('currentTime'),
    
    // Cart & Items
    itemCount: document.getElementById('itemCount'),
    clearCart: document.getElementById('clearCart'),
    orderItems: document.getElementById('orderItems'),
    previewItems: document.getElementById('previewItems'),
    previewTotal: document.getElementById('previewTotal'),
    
    // Pricing
    subtotal: document.getElementById('subtotal'),
    discount: document.getElementById('discount'),
    finalTotal: document.getElementById('finalTotal'),
    
    // Menu Buttons
    addRegular: document.getElementById('addRegular'),
    addPremium: document.getElementById('addPremium'),
    addPaketHemat: document.getElementById('addPaketHemat'),
    
    // Drink Controls
    qtyJeruk: document.getElementById('qtyJeruk'),
    
    // Pages
    posPage: document.getElementById('posPage'),
    reportsPage: document.getElementById('reportsPage'),
    
    // Payment
    cashAmount: document.getElementById('cashAmount'),
    cashChange: document.getElementById('cashChange'),
    cashChangeAmount: document.getElementById('cashChangeAmount'),
    cashError: document.getElementById('cashError'),
    paymentSuccess: document.getElementById('paymentSuccess'),
    processPayment: document.getElementById('processPayment'),
    printReceipt: document.getElementById('printReceipt'),
    
    // QRIS
    qrisTotal: document.getElementById('qrisTotal'),
    qrisPlaceholder: document.getElementById('qrisPlaceholder'),
    qrisCanvas: document.getElementById('qrisCanvas'),
    qrisImage: document.getElementById('qrisImage'),
    confirmPayment: document.getElementById('confirmPayment'),
    cancelPayment: document.getElementById('cancelPayment'),
    
    // Payment Tabs
    methodTabs: document.querySelectorAll('.method-tab'),
    cashMethod: document.getElementById('cashMethod'),
    qrisMethod: document.getElementById('qrisMethod'),
    
    // Reports
    totalIncome: document.getElementById('totalIncome'),
    totalTransactions: document.getElementById('totalTransactions'),
    qrisCount: document.getElementById('qrisCount'),
    averageOrder: document.getElementById('averageOrder'),
    
    // Charts & Performance
    salesChart: document.getElementById('salesChart'),
    chartPeriod: document.getElementById('chartPeriod'),
    
    // Performance Metrics
    countRegular: document.getElementById('countRegular'),
    percentRegular: document.getElementById('percentRegular'),
    progressRegular: document.getElementById('progressRegular'),
    
    countPremium: document.getElementById('countPremium'),
    percentPremium: document.getElementById('percentPremium'),
    progressPremium: document.getElementById('progressPremium'),
    
    countPaket: document.getElementById('countPaket'),
    percentPaket: document.getElementById('percentPaket'),
    progressPaket: document.getElementById('progressPaket'),
    
    countJeruk: document.getElementById('countJeruk'),
    percentJeruk: document.getElementById('percentJeruk'),
    progressJeruk: document.getElementById('progressJeruk'),
    
    // Table Controls
    searchTransactions: document.getElementById('searchTransactions'),
    filterDate: document.getElementById('filterDate'),
    clearFilters: document.getElementById('clearFilters'),
    transactionsBody: document.getElementById('transactionsBody'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    currentPage: document.getElementById('currentPage'),
    totalPages: document.getElementById('totalPages'),
    shownCount: document.getElementById('shownCount'),
    totalCount: document.getElementById('totalCount'),
    
    // Export
    exportReport: document.getElementById('exportReport'),
    refreshReport: document.getElementById('refreshReport'),
    
    // Recent Transactions
    recentTransactions: document.getElementById('recentTransactions'),
    
    // Modals
    receiptModal: document.getElementById('receiptModal'),
    confirmModal: document.getElementById('confirmModal')
};

// Utility Functions
const utils = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
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
    
    formatDateShort: (date) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(date));
    },
    
    generateId: (prefix = 'TRX') => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    },
    
    generateQrisId: () => {
        return `QRIS-${Date.now().toString(36).toUpperCase()}`;
    },
    
    playSound: (type = 'click') => {
        if (!state.settings.soundEnabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            let frequency = 600;
            if (type === 'success') frequency = 800;
            if (type === 'error') frequency = 400;
            if (type === 'qris') frequency = 1000;
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Audio not supported');
        }
    },
    
    showNotification: (message, type = 'info', duration = 3000) => {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 3000;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, duration);
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
    },
    
    saveToLocalStorage: () => {
        try {
            const data = {
                transactions: state.transactions,
                settings: state.settings,
                reports: state.reports,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    },
    
    loadFromLocalStorage: () => {
        try {
            const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (data) {
                state.transactions = data.transactions || [];
                state.settings = { ...CONFIG.DEFAULT_SETTINGS, ...(data.settings || {}) };
                state.reports = data.reports || state.reports;
                
                // Apply dark mode if enabled
                if (state.settings.darkMode) {
                    document.body.classList.add('dark-mode');
                    elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
    },
    
    calculateDiscount: (items) => {
        let discount = 0;
        
        // Check for paket hemat
        const hasNasi = items.some(item => item.type === 'regular' || item.type === 'premium');
        const hasJeruk = items.some(item => item.type === 'jeruk');
        
        if (hasNasi && hasJeruk) {
            // Calculate regular price
            let regularPrice = 0;
            items.forEach(item => {
                if (item.type === 'regular') regularPrice += CONFIG.PRICES.REGULAR;
                if (item.type === 'premium') regularPrice += CONFIG.PRICES.PREMIUM;
                if (item.type === 'jeruk') regularPrice += CONFIG.PRICES.JERUK * item.quantity;
                if (item.type === 'paket') regularPrice += CONFIG.PRICES.PAKET;
            });
            
            // Calculate current price
            const currentPrice = state.cart.finalTotal;
            
            // Calculate discount
            discount = regularPrice - currentPrice;
        }
        
        return discount;
    }
};

// Cart Management
const cartManager = {
    addItem: (type, options = {}) => {
        let item = null;
        
        switch (type) {
            case 'regular':
                const topping = document.querySelector('input[name="topping"]:checked');
                if (!topping) {
                    utils.showNotification('Pilih salah satu topping terlebih dahulu!', 'warning');
                    return;
                }
                
                item = {
                    id: utils.generateId('ITEM'),
                    name: 'Nasi Daun Jeruk + 1 Topping',
                    type: 'regular',
                    price: CONFIG.PRICES.REGULAR,
                    quantity: 1,
                    topping: topping.value,
                    description: `Nasi dengan ${topping.value === 'ayam' ? 'Ayam Suwir' : 'Kulit Crispy'}`
                };
                break;
                
            case 'premium':
                item = {
                    id: utils.generateId('ITEM'),
                    name: 'Paket Lengkap (2 Topping)',
                    type: 'premium',
                    price: CONFIG.PRICES.PREMIUM,
                    quantity: 1,
                    description: 'Nasi dengan Ayam Suwir + Kulit Crispy'
                };
                break;
                
            case 'paket':
                const paketTopping = document.querySelector('input[name="paketTopping"]:checked');
                if (!paketTopping) {
                    utils.showNotification('Pilih salah satu topping untuk paket hemat!', 'warning');
                    return;
                }
                
                item = {
                    id: utils.generateId('ITEM'),
                    name: 'Paket Hemat Nasi + Es Jeruk',
                    type: 'paket',
                    price: CONFIG.PRICES.PAKET,
                    quantity: 1,
                    topping: paketTopping.value,
                    description: `Nasi dengan ${paketTopping.value === 'ayam' ? 'Ayam Suwir' : 'Kulit Crispy'} + Es Jeruk Peras`
                };
                break;
                
            case 'jeruk':
                const existingJeruk = state.cart.items.find(i => i.type === 'jeruk');
                if (existingJeruk) {
                    existingJeruk.quantity += 1;
                    cartManager.updateCart();
                    utils.showNotification('Es Jeruk ditambahkan!', 'success');
                    return;
                }
                
                item = {
                    id: utils.generateId('ITEM'),
                    name: 'Es Jeruk Peras',
                    type: 'jeruk',
                    price: CONFIG.PRICES.JERUK,
                    quantity: 1,
                    description: 'Es jeruk peras segar'
                };
                break;
        }
        
        if (item) {
            state.cart.items.push(item);
            cartManager.updateCart();
            cartManager.animateAddItem(item.type);
            utils.showNotification(`${item.name} ditambahkan ke keranjang!`, 'success');
            utils.playSound('success');
        }
    },
    
    removeItem: (itemId) => {
        state.cart.items = state.cart.items.filter(item => item.id !== itemId);
        cartManager.updateCart();
        utils.playSound();
    },
    
    updateQuantity: (itemId, change) => {
        const item = state.cart.items.find(i => i.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                cartManager.removeItem(itemId);
            } else {
                cartManager.updateCart();
            }
        }
    },
    
    clearCart: () => {
        if (state.cart.items.length === 0) {
            utils.showNotification('Keranjang sudah kosong!', 'info');
            return;
        }
        
        if (confirm('Kosongkan semua item di keranjang?')) {
            state.cart.items = [];
            cartManager.updateCart();
            utils.showNotification('Keranjang berhasil dikosongkan', 'success');
            utils.playSound();
        }
    },
    
    updateCart: () => {
        // Calculate totals
        let subtotal = 0;
        state.cart.items.forEach(item => {
            subtotal += item.price * item.quantity;
        });
        
        // Calculate discount
        const discount = utils.calculateDiscount(state.cart.items);
        const finalTotal = subtotal - discount;
        
        // Update state
        state.cart.subtotal = subtotal;
        state.cart.discount = discount;
        state.cart.finalTotal = finalTotal;
        
        // Update UI
        cartManager.updateCartUI();
        cartManager.updatePreview();
        
        // Update payment validation
        paymentManager.validatePayment();
        
        // Update QRIS total if active
        if (document.querySelector('.method-tab[data-method="qris"]').classList.contains('active')) {
            elements.qrisTotal.textContent = utils.formatCurrency(finalTotal);
            qrisManager.updateQRCode();
        }
    },
    
    updateCartUI: () => {
        // Update item count
        const itemCount = state.cart.items.reduce((total, item) => total + item.quantity, 0);
        elements.itemCount.textContent = itemCount;
        
        // Update totals display
        elements.subtotal.textContent = utils.formatCurrency(state.cart.subtotal);
        elements.discount.textContent = `- ${utils.formatCurrency(state.cart.discount)}`;
        elements.finalTotal.textContent = utils.formatCurrency(state.cart.finalTotal);
        
        // Update order items
        elements.orderItems.innerHTML = '';
        
        if (state.cart.items.length === 0) {
            elements.orderItems.innerHTML = `
                <div class="empty-order">
                    <i class="fas fa-receipt"></i>
                    <h4>Keranjang Kosong</h4>
                    <p>Tambahkan item dari menu untuk memulai transaksi</p>
                </div>
            `;
            return;
        }
        
        state.cart.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.dataset.id = item.id;
            
            let toppingHtml = '';
            if (item.topping) {
                toppingHtml = `<div class="item-topping">${item.topping === 'ayam' ? 'Ayam Suwir' : 'Kulit Crispy'}</div>`;
            }
            
            itemElement.innerHTML = `
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    ${toppingHtml}
                </div>
                <div class="item-qty">
                    <button class="qty-change minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-change plus" data-id="${item.id}">+</button>
                </div>
                <div class="item-price">${utils.formatCurrency(item.price * item.quantity)}</div>
                <button class="item-remove" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            elements.orderItems.appendChild(itemElement);
        });
        
        // Add event listeners
        document.querySelectorAll('.qty-change.minus').forEach(btn => {
            btn.addEventListener('click', function() {
                const itemId = this.dataset.id;
                cartManager.updateQuantity(itemId, -1);
            });
        });
        
        document.querySelectorAll('.qty-change.plus').forEach(btn => {
            btn.addEventListener('click', function() {
                const itemId = this.dataset.id;
                cartManager.updateQuantity(itemId, 1);
            });
        });
        
        document.querySelectorAll('.item-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const itemId = this.dataset.id;
                cartManager.removeItem(itemId);
            });
        });
    },
    
    updatePreview: () => {
        elements.previewItems.innerHTML = '';
        
        if (state.cart.items.length === 0) {
            elements.previewItems.innerHTML = `
                <div class="empty-preview">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Belum ada pesanan</p>
                </div>
            `;
            elements.previewTotal.textContent = 'Rp 0';
            return;
        }
        
        // Show only first 3 items in preview
        const previewItems = state.cart.items.slice(0, 3);
        
        previewItems.forEach(item => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <span>${item.name} ×${item.quantity}</span>
                <span>${utils.formatCurrency(item.price * item.quantity)}</span>
            `;
            elements.previewItems.appendChild(previewItem);
        });
        
        // Show more indicator if there are more items
        if (state.cart.items.length > 3) {
            const moreItem = document.createElement('div');
            moreItem.className = 'preview-item';
            moreItem.innerHTML = `
                <span>+${state.cart.items.length - 3} item lainnya</span>
                <span></span>
            `;
            elements.previewItems.appendChild(moreItem);
        }
        
        elements.previewTotal.textContent = utils.formatCurrency(state.cart.finalTotal);
    },
    
    animateAddItem: (itemType) => {
        const cartIcon = document.querySelector('.fa-shopping-cart');
        if (cartIcon) {
            cartIcon.parentElement.classList.add('bounce');
            setTimeout(() => {
                cartIcon.parentElement.classList.remove('bounce');
            }, 1000);
        }
        
        // Highlight the added item type in menu
        let highlightClass = '';
        if (itemType === 'regular') highlightClass = 'highlight';
        if (itemType === 'premium') highlightClass = 'premium';
        if (itemType === 'paket') highlightClass = 'discount';
        
        const menuItem = document.querySelector(`.menu-item.${highlightClass}`);
        if (menuItem) {
            menuItem.classList.add('pulse');
            setTimeout(() => {
                menuItem.classList.remove('pulse');
            }, 1000);
        }
    },
    
    getCartSummary: () => {
        return {
            items: state.cart.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                description: item.description
            })),
            subtotal: state.cart.subtotal,
            discount: state.cart.discount,
            total: state.cart.finalTotal
        };
    }
};

// Payment Management
const paymentManager = {
    currentMethod: 'cash',
    qrisPaymentId: null,
    qrisTimer: null,
    
    init: () => {
        // Set default payment method
        paymentManager.setPaymentMethod('cash');
        
        // Load quick amount buttons
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const amount = parseInt(this.dataset.amount);
                elements.cashAmount.value = amount;
                paymentManager.validateCashPayment();
                utils.playSound();
            });
        });
        
        // Validate cash input on change
        elements.cashAmount.addEventListener('input', utils.debounce(() => {
            paymentManager.validateCashPayment();
        }, 300));
    },
    
    setPaymentMethod: (method) => {
        paymentManager.currentMethod = method;
        
        // Update UI
        elements.methodTabs.forEach(tab => {
            if (tab.dataset.method === method) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show/hide payment methods
        if (method === 'cash') {
            elements.cashMethod.classList.add('active');
            elements.qrisMethod.classList.remove('active');
        } else {
            elements.cashMethod.classList.remove('active');
            elements.qrisMethod.classList.add('active');
            qrisManager.updateQRCode();
        }
        
        // Update payment validation
        paymentManager.validatePayment();
    },
    
    validatePayment: () => {
        const total = state.cart.finalTotal;
        const hasItems = state.cart.items.length > 0;
        
        if (paymentManager.currentMethod === 'cash') {
            const cash = parseFloat(elements.cashAmount.value) || 0;
            const isValid = hasItems && cash >= total && total > 0;
            
            elements.processPayment.disabled = !isValid;
            elements.printReceipt.disabled = true;
            
            return isValid;
        } else {
            // For QRIS, just need items in cart
            const isValid = hasItems && total > 0;
            
            elements.processPayment.disabled = !isValid;
            elements.printReceipt.disabled = true;
            
            return isValid;
        }
    },
    
    validateCashPayment: () => {
        const cash = parseFloat(elements.cashAmount.value) || 0;
        const total = state.cart.finalTotal;
        
        if (cash >= total && total > 0) {
            const change = cash - total;
            elements.cashChangeAmount.textContent = utils.formatCurrency(change);
            elements.cashChange.style.display = 'block';
            elements.cashError.style.display = 'none';
            utils.playSound('success');
        } else {
            elements.cashChange.style.display = 'none';
            
            if (cash > 0 && cash < total) {
                elements.cashError.style.display = 'block';
                utils.playSound('error');
            } else {
                elements.cashError.style.display = 'none';
            }
        }
        
        paymentManager.validatePayment();
    },
    
    processPayment: () => {
        if (!paymentManager.validatePayment()) {
            utils.showNotification('Pembayaran tidak valid!', 'error');
            return;
        }
        
        if (paymentManager.currentMethod === 'cash') {
            paymentManager.processCashPayment();
        } else {
            paymentManager.processQrisPayment();
        }
    },
    
    processCashPayment: () => {
        const cash = parseFloat(elements.cashAmount.value) || 0;
        const total = state.cart.finalTotal;
        
        if (cash < total) {
            utils.showNotification('Uang pembayaran kurang!', 'error');
            return;
        }
        
        const change = cash - total;
        
        // Create transaction
        const transaction = {
            id: utils.generateId(),
            date: new Date().toISOString(),
            items: [...state.cart.items],
            subtotal: state.cart.subtotal,
            discount: state.cart.discount,
            total: total,
            payment: {
                method: 'cash',
                amount: cash,
                change: change
            },
            status: 'completed'
        };
        
        // Process transaction
        paymentManager.completeTransaction(transaction);
    },
    
    processQrisPayment: () => {
        const total = state.cart.finalTotal;
        
        // Generate QRIS payment ID
        paymentManager.qrisPaymentId = utils.generateQrisId();
        
        // Show payment status
        const statusWaiting = document.querySelector('.status-waiting');
        const statusSuccess = document.querySelector('.status-success');
        const confirmBtn = document.getElementById('confirmPayment');
        const cancelBtn = document.getElementById('cancelPayment');
        
        if (statusWaiting) statusWaiting.style.display = 'flex';
        if (statusSuccess) statusSuccess.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        
        // Simulate QRIS payment timeout
        paymentManager.qrisTimer = setTimeout(() => {
            paymentManager.cancelQrisPayment();
        }, CONFIG.QRIS_TIMEOUT);
        
        // Update QR code with payment info
        qrisManager.generateQRCode({
            amount: total,
            transactionId: paymentManager.qrisPaymentId,
            merchant: 'Nasi Daun Jeruk',
            timestamp: new Date().toISOString()
        });
        
        utils.showNotification('Scan QR code untuk melanjutkan pembayaran', 'info');
        utils.playSound('qris');
    },
    
    confirmQrisPayment: () => {
        if (!paymentManager.qrisPaymentId) {
            utils.showNotification('Tidak ada pembayaran QRIS yang aktif', 'error');
            return;
        }
        
        const total = state.cart.finalTotal;
        
        // Create transaction
        const transaction = {
            id: utils.generateId(),
            date: new Date().toISOString(),
            items: [...state.cart.items],
            subtotal: state.cart.subtotal,
            discount: state.cart.discount,
            total: total,
            payment: {
                method: 'qris',
                qrisId: paymentManager.qrisPaymentId,
                amount: total,
                change: 0
            },
            status: 'completed'
        };
        
        // Update UI
        const statusWaiting = document.querySelector('.status-waiting');
        const statusSuccess = document.querySelector('.status-success');
        const confirmBtn = document.getElementById('confirmPayment');
        const cancelBtn = document.getElementById('cancelPayment');
        
        if (statusWaiting) statusWaiting.style.display = 'none';
        if (statusSuccess) statusSuccess.style.display = 'flex';
        if (confirmBtn) confirmBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
        
        // Clear timer
        clearTimeout(paymentManager.qrisTimer);
        
        // Process transaction
        setTimeout(() => {
            paymentManager.completeTransaction(transaction);
        }, 1500);
        
        utils.showNotification('Pembayaran QRIS berhasil!', 'success');
        utils.playSound('success');
    },
    
    cancelQrisPayment: () => {
        clearTimeout(paymentManager.qrisTimer);
        paymentManager.qrisPaymentId = null;
        
        // Reset UI
        const statusWaiting = document.querySelector('.status-waiting');
        const statusSuccess = document.querySelector('.status-success');
        const confirmBtn = document.getElementById('confirmPayment');
        const cancelBtn = document.getElementById('cancelPayment');
        
        if (statusWaiting) statusWaiting.style.display = 'flex';
        if (statusSuccess) statusSuccess.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        
        // Reset QR code
        qrisManager.resetQRCode();
        
        utils.showNotification('Pembayaran QRIS dibatalkan', 'warning');
        utils.playSound();
    },
    
    completeTransaction: (transaction) => {
        // Add to transactions
        state.transactions.unshift(transaction);
        
        // Update reports
        reportManager.updateReports();
        
        // Save to localStorage
        utils.saveToLocalStorage();
        
        // Show success message
        elements.paymentSuccess.style.display = 'block';
        setTimeout(() => {
            elements.paymentSuccess.style.display = 'none';
        }, 3000);
        
        // Enable receipt printing
        elements.printReceipt.disabled = false;
        
        // Store transaction for receipt
        window.currentTransaction = transaction;
        
        // Clear cart
        state.cart.items = [];
        cartManager.updateCart();
        
        // Reset cash input
        elements.cashAmount.value = '';
        elements.cashChange.style.display = 'none';
        
        // Reset QRIS if active
        if (paymentManager.currentMethod === 'qris') {
            paymentManager.cancelQrisPayment();
        }
        
        // Update recent transactions
        reportManager.updateRecentTransactions();
        
        utils.showNotification('Transaksi berhasil diproses!', 'success');
        utils.playSound('success');
    }
};

// QRIS Manager
const qrisManager = {
    generateQRCode: (data) => {
        const total = state.cart.finalTotal;
        const qrisId = paymentManager.qrisPaymentId || utils.generateQrisId();
        
        // Create QRIS data string
        const qrisData = JSON.stringify({
            id: qrisId,
            amount: total,
            merchant: 'Nasi Daun Jeruk',
            timestamp: new Date().toISOString(),
            items: state.cart.items.length
        });
        
        // Generate QR code
        try {
            QRCode.toCanvas(elements.qrisCanvas, qrisData, {
                width: 250,
                height: 250,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                margin: 1
            }, (error) => {
                if (error) {
                    console.error('QR Code generation failed:', error);
                    qrisManager.showFallbackQR(total, qrisId);
                } else {
                    elements.qrisPlaceholder.style.display = 'none';
                    elements.qrisCanvas.style.display = 'block';
                    elements.qrisImage.style.display = 'none';
                }
            });
        } catch (error) {
            qrisManager.showFallbackQR(total, qrisId);
        }
    },
    
    showFallbackQR: (amount, qrisId) => {
        // Create a simple visual representation of QR code
        elements.qrisPlaceholder.innerHTML = `
            <div style="text-align: center;">
                <div style="background: #000; color: #fff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-family: monospace;">
                    <div>QRIS PAYMENT</div>
                    <div style="font-size: 1.5rem; font-weight: bold; margin: 0.5rem 0;">${utils.formatCurrency(amount)}</div>
                    <div style="font-size: 0.8rem;">ID: ${qrisId}</div>
                </div>
                <p>Simulasi QRIS Payment</p>
                <p style="font-size: 0.9rem; color: #666;">Klik "Konfirmasi Pembayaran" untuk melanjutkan</p>
            </div>
        `;
        elements.qrisPlaceholder.style.display = 'block';
        elements.qrisCanvas.style.display = 'none';
        elements.qrisImage.style.display = 'none';
    },
    
    updateQRCode: () => {
        if (state.cart.items.length === 0) {
            elements.qrisPlaceholder.innerHTML = `
                <i class="fas fa-qrcode"></i>
                <p>Tambahkan item ke keranjang untuk menampilkan QR Code</p>
            `;
            elements.qrisPlaceholder.style.display = 'block';
            elements.qrisCanvas.style.display = 'none';
            elements.qrisImage.style.display = 'none';
            return;
        }
        
        elements.qrisTotal.textContent = utils.formatCurrency(state.cart.finalTotal);
        
        if (paymentManager.qrisPaymentId) {
            qrisManager.generateQRCode();
        } else {
            elements.qrisPlaceholder.innerHTML = `
                <i class="fas fa-qrcode"></i>
                <p>QR Code akan muncul setelah memulai pembayaran</p>
                <p style="font-size: 0.9rem; color: #666;">Total: ${utils.formatCurrency(state.cart.finalTotal)}</p>
            `;
            elements.qrisPlaceholder.style.display = 'block';
            elements.qrisCanvas.style.display = 'none';
            elements.qrisImage.style.display = 'none';
        }
    },
    
    resetQRCode: () => {
        paymentManager.qrisPaymentId = null;
        qrisManager.updateQRCode();
    }
};

// Report Manager
const reportManager = {
    chart: null,
    
    init: () => {
        // Initialize chart
        reportManager.initChart();
        
        // Load transactions
        reportManager.loadTransactions();
        
        // Set up event listeners
        elements.chartPeriod.addEventListener('change', reportManager.updateChart);
        elements.searchTransactions.addEventListener('input', utils.debounce(() => {
            reportManager.loadTransactions();
        }, 300));
        
        elements.filterDate.addEventListener('change', reportManager.loadTransactions);
        elements.clearFilters.addEventListener('click', reportManager.clearFilters);
        elements.prevPage.addEventListener('click', () => reportManager.changePage(-1));
        elements.nextPage.addEventListener('click', () => reportManager.changePage(1));
        elements.exportReport.addEventListener('click', reportManager.exportReport);
        elements.refreshReport.addEventListener('click', reportManager.refreshReports);
    },
    
    updateReports: () => {
        // Calculate daily income
        const today = new Date().toDateString();
        const todayTransactions = state.transactions.filter(t => 
            new Date(t.date).toDateString() === today
        );
        
        state.reports.dailyIncome = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        state.reports.totalTransactions = state.transactions.length;
        state.reports.qrisTransactions = state.transactions.filter(t => 
            t.payment.method === 'qris'
        ).length;
        
        state.reports.averageOrder = state.transactions.length > 0 ?
            state.transactions.reduce((sum, t) => sum + t.total, 0) / state.transactions.length : 0;
        
        // Update UI
        elements.totalIncome.textContent = utils.formatCurrency(state.reports.dailyIncome);
        elements.totalTransactions.textContent = state.reports.totalTransactions;
        elements.qrisCount.textContent = state.reports.qrisTransactions;
        elements.averageOrder.textContent = utils.formatCurrency(Math.round(state.reports.averageOrder));
        
        // Update performance metrics
        reportManager.updatePerformanceMetrics();
        
        // Update chart
        reportManager.updateChart();
    },
    
    updatePerformanceMetrics: () => {
        const counts = {
            regular: 0,
            premium: 0,
            paket: 0,
            jeruk: 0
        };
        
        // Count each item type
        state.transactions.forEach(transaction => {
            transaction.items.forEach(item => {
                if (item.type === 'regular') counts.regular += item.quantity;
                if (item.type === 'premium') counts.premium += item.quantity;
                if (item.type === 'paket') counts.paket += item.quantity;
                if (item.type === 'jeruk') counts.jeruk += item.quantity;
            });
        });
        
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        
        // Update regular
        elements.countRegular.textContent = counts.regular;
        elements.percentRegular.textContent = total > 0 ? `${Math.round((counts.regular / total) * 100)}%` : '0%';
        elements.progressRegular.style.width = total > 0 ? `${(counts.regular / total) * 100}%` : '0%';
        
        // Update premium
        elements.countPremium.textContent = counts.premium;
        elements.percentPremium.textContent = total > 0 ? `${Math.round((counts.premium / total) * 100)}%` : '0%';
        elements.progressPremium.style.width = total > 0 ? `${(counts.premium / total) * 100}%` : '0%';
        
        // Update paket
        elements.countPaket.textContent = counts.paket;
        elements.percentPaket.textContent = total > 0 ? `${Math.round((counts.paket / total) * 100)}%` : '0%';
        elements.progressPaket.style.width = total > 0 ? `${(counts.paket / total) * 100}%` : '0%';
        
        // Update jeruk
        elements.countJeruk.textContent = counts.jeruk;
        elements.percentJeruk.textContent = total > 0 ? `${Math.round((counts.jeruk / total) * 100)}%` : '0%';
        elements.progressJeruk.style.width = total > 0 ? `${(counts.jeruk / total) * 100}%` : '0%';
    },
    
    initChart: () => {
        const ctx = elements.salesChart.getContext('2d');
        
        reportManager.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Pendapatan (Rp)',
                    data: [],
                    borderColor: 'rgb(46, 125, 50)',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Rp ${context.raw.toLocaleString('id-ID')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                return `Rp ${value.toLocaleString('id-ID')}`;
                            }
                        }
                    }
                }
            }
        });
        
        reportManager.updateChart();
    },
    
    updateChart: () => {
        const period = elements.chartPeriod.value;
        let labels = [];
        let data = [];
        
        const now = new Date();
        
        if (period === 'today') {
            // Last 12 hours
            for (let i = 11; i >= 0; i--) {
                const hour = new Date(now);
                hour.setHours(now.getHours() - i);
                labels.push(`${hour.getHours()}:00`);
                
                // Calculate revenue for this hour
                const hourStart = new Date(hour);
                hourStart.setMinutes(0, 0, 0);
                const hourEnd = new Date(hour);
                hourEnd.setMinutes(59, 59, 999);
                
                const revenue = state.transactions
                    .filter(t => {
                        const date = new Date(t.date);
                        return date >= hourStart && date <= hourEnd;
                    })
                    .reduce((sum, t) => sum + t.total, 0);
                
                data.push(revenue);
            }
        } else if (period === 'week') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(now.getDate() - i);
                labels.push(utils.formatDateShort(date));
                
                // Calculate revenue for this day
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);
                
                const revenue = state.transactions
                    .filter(t => {
                        const transDate = new Date(t.date);
                        return transDate >= dayStart && transDate <= dayEnd;
                    })
                    .reduce((sum, t) => sum + t.total, 0);
                
                data.push(revenue);
            }
        } else if (period === 'month') {
            // Last 30 days
            for (let i = 29; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(now.getDate() - i);
                labels.push(date.getDate().toString());
                
                // Calculate revenue for this day
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);
                
                const revenue = state.transactions
                    .filter(t => {
                        const transDate = new Date(t.date);
                        return transDate >= dayStart && transDate <= dayEnd;
                    })
                    .reduce((sum, t) => sum + t.total, 0);
                
                data.push(revenue);
            }
        }
        
        reportManager.chart.data.labels = labels;
        reportManager.chart.data.datasets[0].data = data;
        reportManager.chart.update();
    },
    
    loadTransactions: () => {
        let filtered = [...state.transactions];
        
        // Apply search filter
        const searchTerm = elements.searchTransactions.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.id.toLowerCase().includes(searchTerm) ||
                t.items.some(item => item.name.toLowerCase().includes(searchTerm)) ||
                t.payment.method.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply date filter
        const dateFilter = elements.filterDate.value;
        if (dateFilter) {
            const selectedDate = new Date(dateFilter);
            filtered = filtered.filter(t => {
                const transDate = new Date(t.date);
                return transDate.toDateString() === selectedDate.toDateString();
            });
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(filtered.length / state.itemsPerPage);
        state.currentPage = Math.min(state.currentPage, Math.max(1, totalPages));
        
        // Get current page data
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const endIndex = startIndex + state.itemsPerPage;
        const pageData = filtered.slice(startIndex, endIndex);
        
        // Update table
        reportManager.updateTransactionsTable(pageData);
        
        // Update pagination
        elements.currentPage.textContent = state.currentPage;
        elements.totalPages.textContent = totalPages || 1;
        elements.shownCount.textContent = pageData.length;
        elements.totalCount.textContent = filtered.length;
        
        // Update button states
        elements.prevPage.disabled = state.currentPage <= 1;
        elements.nextPage.disabled = state.currentPage >= totalPages;
    },
    
    updateTransactionsTable: (transactions) => {
        elements.transactionsBody.innerHTML = '';
        
        if (transactions.length === 0) {
            elements.transactionsBody.innerHTML = `
                <tr class="no-data">
                    <td colspan="7">
                        <i class="fas fa-database"></i>
                        <p>Tidak ada data transaksi</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            // Format items list
            const itemsList = transaction.items.map(item => 
                `${item.name} ×${item.quantity}`
            ).join(', ');
            
            // Format payment method
            const methodBadge = transaction.payment.method === 'qris' ?
                '<span class="status-badge status-qris"><i class="fas fa-qrcode"></i> QRIS</span>' :
                '<span class="status-badge status-success"><i class="fas fa-money-bill"></i> Tunai</span>';
            
            row.innerHTML = `
                <td>${transaction.id}</td>
                <td>${utils.formatDate(new Date(transaction.date))}</td>
                <td>${itemsList}</td>
                <td>${methodBadge}</td>
                <td>${utils.formatCurrency(transaction.total)}</td>
                <td><span class="status-badge status-success">Selesai</span></td>
                <td>
                    <button class="btn-small btn-outline view-transaction" data-id="${transaction.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            elements.transactionsBody.appendChild(row);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-transaction').forEach(btn => {
            btn.addEventListener('click', function() {
                const transactionId = this.dataset.id;
                const transaction = state.transactions.find(t => t.id === transactionId);
                if (transaction) {
                    receiptManager.showReceipt(transaction);
                }
            });
        });
    },
    
    clearFilters: () => {
        elements.searchTransactions.value = '';
        elements.filterDate.value = '';
        state.currentPage = 1;
        reportManager.loadTransactions();
        utils.showNotification('Filter berhasil direset', 'success');
    },
    
    changePage: (direction) => {
        const newPage = state.currentPage + direction;
        if (newPage >= 1) {
            state.currentPage = newPage;
            reportManager.loadTransactions();
        }
    },
    
    updateRecentTransactions: () => {
        elements.recentTransactions.innerHTML = '';
        
        const recent = state.transactions.slice(0, 4); // Show last 4 transactions
        
        if (recent.length === 0) {
            elements.recentTransactions.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-receipt"></i>
                    <p>Belum ada transaksi hari ini</p>
                </div>
            `;
            return;
        }
        
        recent.forEach(transaction => {
            const isQris = transaction.payment.method === 'qris';
            
            const card = document.createElement('div');
            card.className = `transaction-card ${isQris ? 'qris' : ''}`;
            card.innerHTML = `
                <div class="transaction-header">
                    <div class="transaction-id">${transaction.id}</div>
                    <div class="transaction-time">${utils.formatDate(new Date(transaction.date))}</div>
                </div>
                <div class="transaction-method">
                    <i class="fas fa-${isQris ? 'qrcode' : 'money-bill'}"></i>
                    ${isQris ? 'QRIS' : 'Tunai'}
                </div>
                <div class="transaction-total">${utils.formatCurrency(transaction.total)}</div>
            `;
            
            elements.recentTransactions.appendChild(card);
        });
    },
    
    exportReport: () => {
        if (state.transactions.length === 0) {
            utils.showNotification('Tidak ada data untuk diexport', 'warning');
            return;
        }
        
        // Create CSV content
        let csv = 'ID,Tanggal,Items,Jumlah Item,Subtotal,Diskon,Total,Metode,Bayar,Kembali,Status\n';
        
        state.transactions.forEach(transaction => {
            const itemsList = transaction.items.map(item => 
                `${item.name} (${item.quantity}x)`
            ).join('; ');
            
            const itemCount = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
            
            csv += `"${transaction.id}",`;
            csv += `"${utils.formatDate(new Date(transaction.date))}",`;
            csv += `"${itemsList}",`;
            csv += `${itemCount},`;
            csv += `${transaction.subtotal},`;
            csv += `${transaction.discount},`;
            csv += `${transaction.total},`;
            csv += `${transaction.payment.method},`;
            csv += `${transaction.payment.amount},`;
            csv += `${transaction.payment.change},`;
            csv += `"${transaction.status}"\n`;
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `laporan_nasi_daun_jeruk_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        utils.showNotification('Laporan berhasil diexport ke CSV', 'success');
    },
    
    refreshReports: () => {
        reportManager.updateReports();
        reportManager.loadTransactions();
        utils.showNotification('Laporan diperbarui', 'success');
    }
};

// Receipt Manager
const receiptManager = {
    showReceipt: (transaction) => {
        // Update receipt content
        document.getElementById('receiptId').textContent = transaction.id;
        document.getElementById('receiptDate').textContent = utils.formatDate(new Date(transaction.date));
        document.getElementById('receiptCashier').textContent = 'Kasir: Admin';
        document.getElementById('receiptMethod').textContent = 
            transaction.payment.method === 'qris' ? 'QRIS' : 'Tunai';
        
        document.getElementById('receiptSubtotal').textContent = utils.formatCurrency(transaction.subtotal);
        document.getElementById('receiptDiscount').textContent = `- ${utils.formatCurrency(transaction.discount)}`;
        document.getElementById('receiptGrandTotal').textContent = utils.formatCurrency(transaction.total);
        document.getElementById('receiptPaid').textContent = utils.formatCurrency(transaction.payment.amount);
        document.getElementById('receiptChange').textContent = utils.formatCurrency(transaction.payment.change);
        
        // Update QRIS section if applicable
        const qrisSection = document.getElementById('receiptQrisSection');
        const receiptQrisId = document.getElementById('receiptQrisId');
        
        if (transaction.payment.method === 'qris' && transaction.payment.qrisId) {
            qrisSection.style.display = 'block';
            receiptQrisId.textContent = transaction.payment.qrisId;
        } else {
            qrisSection.style.display = 'none';
        }
        
        // Update receipt items
        const receiptItems = document.getElementById('receiptItems');
        receiptItems.innerHTML = '';
        
        transaction.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'receipt-item';
            
            let description = item.description || '';
            if (item.topping) {
                description += ` (${item.topping === 'ayam' ? 'Ayam Suwir' : 'Kulit Crispy'})`;
            }
            
            itemElement.innerHTML = `
                <div>
                    <div>${item.name}</div>
                    <div style="font-size: 0.85em; color: #666;">${description}</div>
                </div>
                <div style="text-align: right;">
                    <div>${item.quantity} × ${utils.formatCurrency(item.price)}</div>
                    <div style="font-weight: bold;">${utils.formatCurrency(item.price * item.quantity)}</div>
                </div>
            `;
            
            receiptItems.appendChild(itemElement);
        });
        
        // Show modal
        elements.receiptModal.style.display = 'flex';
        utils.playSound();
    },
    
    printReceipt: () => {
        if (!window.currentTransaction) {
            utils.showNotification('Tidak ada transaksi untuk dicetak', 'warning');
            return;
        }
        
        const printContent = document.querySelector('.receipt-modal').cloneNode(true);
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Struk Nasi Daun Jeruk</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Roboto Mono', monospace;
                        font-size: 12px;
                        padding: 15px;
                        max-width: 400px;
                        margin: 0 auto;
                        background: white;
                        color: black;
                    }
                    
                    .receipt-header {
                        text-align: center;
                        margin-bottom: 15px;
                        padding-bottom: 15px;
                        border-bottom: 2px dashed #000;
                    }
                    
                    .receipt-logo {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        margin-bottom: 10px;
                    }
                    
                    .receipt-logo i {
                        font-size: 24px;
                        color: #2E7D32;
                    }
                    
                    .receipt-logo h3 {
                        font-size: 16px;
                        margin: 0;
                        color: #000;
                    }
                    
                    .receipt-info p {
                        font-size: 10px;
                        margin: 2px 0;
                        color: #666;
                    }
                    
                    .receipt-transaction {
                        margin: 15px 0;
                        font-size: 11px;
                    }
                    
                    .receipt-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 3px 0;
                    }
                    
                    .receipt-divider {
                        text-align: center;
                        margin: 10px 0;
                        padding: 5px 0;
                        border-bottom: 1px dashed #000;
                        font-weight: bold;
                    }
                    
                    .receipt-item {
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        padding-bottom: 8px;
                        border-bottom: 1px dashed #ccc;
                    }
                    
                    .receipt-total {
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 2px solid #000;
                    }
                    
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 5px 0;
                    }
                    
                    .grand-total {
                        font-size: 14px;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                    
                    .change {
                        font-size: 13px;
                        font-weight: bold;
                        color: #2E7D32;
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 1px dashed #000;
                    }
                    
                    .receipt-qris {
                        background: #f0f8ff;
                        padding: 10px;
                        margin: 15px 0;
                        border-left: 4px solid #2196F3;
                        font-size: 11px;
                    }
                    
                    .receipt-footer {
                        text-align: center;
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px dashed #000;
                        font-size: 10px;
                        color: #666;
                    }
                    
                    .thank-you {
                        font-weight: bold;
                        font-size: 11px;
                        margin-bottom: 10px;
                        color: #000;
                    }
                    
                    .note {
                        font-style: italic;
                        margin: 3px 0;
                    }
                    
                    @media print {
                        body {
                            padding: 10px;
                            font-size: 11px;
                        }
                        
                        button {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Wait for content to load, then print
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            
            // Close window after printing
            setTimeout(() => {
                if (!printWindow.closed) {
                    printWindow.close();
                }
            }, 500);
        }, 250);
    }
};

// Settings Manager
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
        
        utils.saveToLocalStorage();
    },
    
    toggleSound: () => {
        state.settings.soundEnabled = !state.settings.soundEnabled;
        utils.showNotification(
            state.settings.soundEnabled ? 'Suara diaktifkan' : 'Suara dinonaktifkan',
            'info'
        );
        utils.saveToLocalStorage();
    }
};

// Initialize Application
const initApp = () => {
    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initializing...`);
    
    // Load data from localStorage
    utils.loadFromLocalStorage();
    
    // Initialize modules
    cartManager.updateCart();
    paymentManager.init();
    reportManager.init();
    
    // Update time display
    const updateTime = () => {
        const now = new Date();
        elements.currentTime.textContent = now.toLocaleTimeString('id-ID', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    updateTime();
    setInterval(updateTime, 1000);
    
    // ===== EVENT LISTENERS =====
    
    // Navigation
    elements.posTab.addEventListener('click', () => {
        elements.posTab.classList.add('active');
        elements.backupTab.classList.remove('active');
        elements.posPage.classList.add('active');
        elements.reportsPage.classList.remove('active');
        utils.playSound();
    });
    
    elements.backupTab.addEventListener('click', () => {
        elements.backupTab.classList.add('active');
        elements.posTab.classList.remove('active');
        elements.reportsPage.classList.add('active');
        elements.posPage.classList.remove('active');
        reportManager.refreshReports();
        utils.playSound();
    });
    
    elements.darkModeToggle.addEventListener('click', settingsManager.toggleDarkMode);
    
    // Menu Actions
    elements.addRegular.addEventListener('click', () => cartManager.addItem('regular'));
    elements.addPremium.addEventListener('click', () => cartManager.addItem('premium'));
    elements.addPaketHemat.addEventListener('click', () => cartManager.addItem('paket'));
    
    // Drink Controls
    document.querySelectorAll('.qty-btn.plus[data-drink="jeruk"]').forEach(btn => {
        btn.addEventListener('click', () => cartManager.addItem('jeruk'));
    });
    
    document.querySelectorAll('.qty-btn.minus[data-drink="jeruk"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const jerukItem = state.cart.items.find(i => i.type === 'jeruk');
            if (jerukItem) {
                cartManager.updateQuantity(jerukItem.id, -1);
            }
        });
    });
    
    // Cart Actions
    elements.clearCart.addEventListener('click', cartManager.clearCart);
    
    // Payment Methods
    elements.methodTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const method = this.dataset.method;
            paymentManager.setPaymentMethod(method);
            utils.playSound();
        });
    });
    
    // Payment Processing
    elements.processPayment.addEventListener('click', paymentManager.processPayment);
    elements.printReceipt.addEventListener('click', () => {
        if (window.currentTransaction) {
            receiptManager.printReceipt();
        } else {
            utils.showNotification('Tidak ada transaksi untuk dicetak', 'warning');
        }
    });
    
    // QRIS Payment
    elements.confirmPayment.addEventListener('click', paymentManager.confirmQrisPayment);
    elements.cancelPayment.addEventListener('click', paymentManager.cancelQrisPayment);
    
    // Receipt Modal
    document.getElementById('closeReceipt').addEventListener('click', () => {
        elements.receiptModal.style.display = 'none';
    });
    
    document.getElementById('printReceiptBtn').addEventListener('click', receiptManager.printReceipt);
    
    // Confirmation Modal
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
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', (event) => {
        // F1 - Help
        if (event.key === 'F1') {
            event.preventDefault();
            alert(`Nasi Daun Jeruk POS v${CONFIG.VERSION}\n\nShortcuts:\nF1 - Bantuan\nF2 - Mode Kasir\nF3 - Mode Laporan\nF5 - Refresh\nF8 - QRIS Payment\nF9 - Cash Payment\nF12 - Developer Tools\n\n© 2024 Nasi Daun Jeruk`);
        }
        
        // F2 - POS Mode
        if (event.key === 'F2') {
            event.preventDefault();
            elements.posTab.click();
        }
        
        // F3 - Reports Mode
        if (event.key === 'F3') {
            event.preventDefault();
            elements.backupTab.click();
        }
        
        // F8 - QRIS Payment
        if (event.key === 'F8' && elements.posPage.classList.contains('active')) {
            event.preventDefault();
            paymentManager.setPaymentMethod('qris');
        }
        
        // F9 - Cash Payment
        if (event.key === 'F9' && elements.posPage.classList.contains('active')) {
            event.preventDefault();
            paymentManager.setPaymentMethod('cash');
        }
        
        // Escape - Close modals
        if (event.key === 'Escape') {
            elements.receiptModal.style.display = 'none';
            elements.confirmModal.style.display = 'none';
        }
        
        // Ctrl + P - Print receipt
        if (event.ctrlKey && event.key === 'p') {
            event.preventDefault();
            if (window.currentTransaction) {
                receiptManager.printReceipt();
            }
        }
        
        // Ctrl + S - Process payment
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            elements.processPayment.click();
        }
        
        // Ctrl + D - Dark mode
        if (event.ctrlKey && event.key === 'd') {
            event.preventDefault();
            settingsManager.toggleDarkMode();
        }
    });
    
    // Auto-save every 30 seconds
    setInterval(() => {
        utils.saveToLocalStorage();
    }, 30000);
    
    // Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered:', registration);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }
    
    // Initial updates
    reportManager.updateReports();
    reportManager.updateRecentTransactions();
    
    // Set today's date in filter
    const today = new Date().toISOString().split('T')[0];
    elements.filterDate.value = today;
    
    // Welcome message
    setTimeout(() => {
        utils.showNotification(
            `${CONFIG.APP_NAME} v${CONFIG.VERSION} siap digunakan!`,
            'success',
            5000
        );
    }, 1500);
    
    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized successfully!`);
};

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Make app available globally for debugging
window.NasiDaunJerukPOS = {
    config: CONFIG,
    state: state,
    utils: utils,
    cart: cartManager,
    payment: paymentManager,
    qris: qrisManager,
    reports: reportManager,
    receipt: receiptManager,
    settings: settingsManager
};