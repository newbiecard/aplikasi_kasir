// ============================================
// NASI DAUN JERUK POS v2 - MAIN APPLICATION
// Complete with QRIS, Dark Mode, and Backup
// ============================================

// ==================== CONFIGURATION ====================
const CONFIG = {
    appName: "Nasi Daun Jeruk POS v2",
    version: "2.0.0",
    currency: "IDR",
    taxRate: 0, // No tax
    storageKey: "ndj_pos_v2_",
    enableSounds: true,
    qrisProviders: ['gopay', 'dana', 'ovo', 'shopeepay']
};

// ==================== MENU DATA ====================
const MENU_ITEMS = {
    1: {
        id: 1,
        name: "Nasi Daun Jeruk Biasa",
        category: "nasi",
        basePrice: 10000,
        description: "Pilih 1 topping favorit",
        requiresTopping: true,
        toppings: {
            "kulit": {
                name: "Kulit Ayam Crispy",
                price: 0
            },
            "suwir": {
                name: "Ayam Suwir",
                price: 0
            }
        },
        icon: "fas fa-rice",
        badge: "BEST"
    },
    2: {
        id: 2,
        name: "Paket Lengkap",
        category: "nasi",
        basePrice: 12000,
        description: "Nasi + Kulit + Suwir + Lalapan",
        requiresTopping: false,
        icon: "fas fa-crown",
        badge: "PREMIUM"
    },
    3: {
        id: 3,
        name: "Paket Hemat",
        category: "nasi",
        basePrice: 13000,
        description: "Nasi + Es Jeruk Peras",
        requiresTopping: false,
        icon: "fas fa-piggy-bank",
        badge: "HEMAT"
    },
    4: {
        id: 4,
        name: "Es Jeruk Peras",
        category: "minuman",
        basePrice: 5000,
        description: "Minuman segar asli perasan",
        requiresTopping: false,
        icon: "fas fa-glass-whiskey",
        badge: null
    },
    5: {
        id: 5,
        name: "Paket Komplit",
        category: "nasi",
        basePrice: 15000,
        description: "Nasi + Kulit + Es Jeruk Double",
        requiresTopping: false,
        icon: "fas fa-star",
        badge: "SPECIAL"
    }
};

// ==================== STATE MANAGEMENT ====================
let state = {
    cart: [],
    transactions: [],
    settings: {
        theme: 'light',
        enableSounds: true,
        autoBackup: true
    },
    dailyStats: {
        transactionCount: 0,
        totalIncome: 0,
        cashTransactions: 0,
        qrisTransactions: 0
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateDateTime();
    loadCartFromStorage();
    loadDailyStats();
    setInterval(updateDateTime, 1000);
});

function initializeApp() {
    console.log(`${CONFIG.appName} v${CONFIG.version} initializing...`);
    
    // Load saved state
    loadStateFromStorage();
    
    // Apply theme
    applyTheme(state.settings.theme);
    
    // Load transactions
    loadTransactions();
    
    // Update UI
    updateCartDisplay();
    updateCartSummary();
    updateQuickStats();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        showToast('Sistem siap digunakan!', 'success');
    }, 800);
}

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Fullscreen toggle
    document.getElementById('fullscreenToggle').addEventListener('click', toggleFullscreen);
    
    // Payment method change
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            togglePaymentSection(this.value);
        });
    });
    
    // Cash amount input
    document.getElementById('cashAmount').addEventListener('input', calculateChange);
    
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            filterMenuByCategory(this.dataset.category);
        });
    });
    
    // Reset menu button
    document.getElementById('resetMenu').addEventListener('click', resetMenuFilters);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ==================== THEME MANAGEMENT ====================
function applyTheme(theme) {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    body.setAttribute('data-theme', theme);
    state.settings.theme = theme;
    
    // Update toggle button icon
    if (theme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.title = 'Switch to light mode';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.title = 'Switch to dark mode';
    }
    
    // Save theme preference
    saveStateToStorage();
}

function toggleTheme() {
    const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    showToast(`Mode ${newTheme === 'dark' ? 'gelap' : 'terang'} diaktifkan`);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// ==================== CART FUNCTIONS ====================
function addToCart(itemId) {
    const menuItem = MENU_ITEMS[itemId];
    
    if (!menuItem) {
        showAlert('Error', 'Menu tidak ditemukan!', 'error');
        return;
    }
    
    // Check if item requires topping
    let selectedTopping = null;
    if (menuItem.requiresTopping) {
        const toppingInput = document.querySelector(`input[name="topping_${itemId}"]:checked`);
        if (!toppingInput) {
            showAlert('Pilih Topping', 'Silakan pilih topping terlebih dahulu!', 'warning');
            return;
        }
        selectedTopping = menuItem.toppings[toppingInput.value];
    }
    
    // Check if item already exists in cart with same configuration
    const existingIndex = state.cart.findIndex(item => 
        item.id === itemId && 
        JSON.stringify(item.topping) === JSON.stringify(selectedTopping)
    );
    
    if (existingIndex !== -1) {
        // Increase quantity
        state.cart[existingIndex].quantity += 1;
    } else {
        // Add new item
        const cartItem = {
            id: itemId,
            name: menuItem.name,
            basePrice: menuItem.basePrice,
            quantity: 1,
            topping: selectedTopping,
            category: menuItem.category,
            icon: menuItem.icon
        };
        
        state.cart.push(cartItem);
    }
    
    // Update storage and UI
    saveCartToStorage();
    updateCartDisplay();
    updateQuickStats();
    updateCartSummary();
    
    // Play sound if enabled
    if (state.settings.enableSounds) {
        playSound('cashSound');
    }
    
    showToast(`${menuItem.name} ditambahkan ke keranjang!`);
    
    // Update QR code if QRIS is selected
    if (document.querySelector('input[name="paymentMethod"][value="qris"]').checked) {
        generateQRCode();
    }
}

function updateCartItem(index, change) {
    if (index < 0 || index >= state.cart.length) return;
    
    state.cart[index].quantity += change;
    
    // Remove if quantity is 0 or less
    if (state.cart[index].quantity <= 0) {
        state.cart.splice(index, 1);
    }
    
    // Update storage and UI
    saveCartToStorage();
    updateCartDisplay();
    updateQuickStats();
    updateCartSummary();
    
    // Update QR code if needed
    if (document.querySelector('input[name="paymentMethod"][value="qris"]').checked) {
        generateQRCode();
    }
}

function removeCartItem(index) {
    if (index < 0 || index >= state.cart.length) return;
    
    const removedItem = state.cart[index];
    state.cart.splice(index, 1);
    
    saveCartToStorage();
    updateCartDisplay();
    updateQuickStats();
    updateCartSummary();
    
    showToast(`${removedItem.name} dihapus dari keranjang`);
    
    // Update QR code if needed
    if (document.querySelector('input[name="paymentMethod"][value="qris"]').checked) {
        generateQRCode();
    }
}

function clearCart() {
    if (state.cart.length === 0) {
        showToast('Keranjang sudah kosong');
        return;
    }
    
    if (confirm('Apakah Anda yakin ingin mengosongkan keranjang?')) {
        state.cart = [];
        saveCartToStorage();
        updateCartDisplay();
        updateQuickStats();
        updateCartSummary();
        document.getElementById('cashAmount').value = '';
        calculateChange();
        
        showToast('Keranjang berhasil dikosongkan');
    }
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const processBtn = document.getElementById('processTransaction');
    
    cartCount.textContent = state.cart.length;
    processBtn.disabled = state.cart.length === 0;
    
    if (state.cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-state">
                <i class="fas fa-shopping-basket"></i>
                <h3>Keranjang Kosong</h3>
                <p>Tambahkan menu dari panel kiri</p>
            </div>
        `;
        return;
    }
    
    let cartHTML = '';
    state.cart.forEach((item, index) => {
        const itemTotal = item.basePrice * item.quantity;
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    ${item.topping ? `<div class="cart-item-topping">Topping: ${item.topping.name}</div>` : ''}
                    <div class="cart-item-price">Rp ${item.basePrice.toLocaleString('id-ID')}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateCartItem(${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItem(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="item-total">Rp ${itemTotal.toLocaleString('id-ID')}</div>
                    <button class="quantity-btn remove" onclick="removeCartItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = cartHTML;
}

function updateCartSummary() {
    const subtotalEl = document.getElementById('subtotalAmount');
    const totalEl = document.getElementById('totalAmount');
    const cartTotalEl = document.getElementById('cartTotal');
    
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    
    subtotalEl.textContent = formatCurrency(subtotal);
    totalEl.textContent = formatCurrency(total);
    cartTotalEl.textContent = formatCurrency(total);
    
    // Update QRIS amount display
    const qrisAmountEl = document.getElementById('qrisAmountDisplay');
    if (qrisAmountEl) {
        qrisAmountEl.textContent = formatCurrency(total);
    }
    
    // Update cash calculation
    calculateChange();
}

function calculateSubtotal() {
    return state.cart.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
}

function calculateTotal() {
    const subtotal = calculateSubtotal();
    const tax = subtotal * (CONFIG.taxRate / 100);
    return subtotal + tax;
}

// ==================== PAYMENT FUNCTIONS ====================
function togglePaymentSection(method) {
    const cashSection = document.getElementById('cashPayment');
    const qrisSection = document.getElementById('qrisPayment');
    
    // Update active state in UI
    document.querySelectorAll('.payment-method-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`.payment-method-option[data-method="${method}"]`).classList.add('active');
    
    if (method === 'cash') {
        cashSection.style.display = 'block';
        qrisSection.style.display = 'none';
        document.getElementById('cashAmount').focus();
    } else {
        cashSection.style.display = 'none';
        qrisSection.style.display = 'block';
        generateQRCode();
    }
}

function calculateChange() {
    const cashInput = document.getElementById('cashAmount');
    const changeEl = document.getElementById('changeAmount');
    const validationEl = document.getElementById('cashValidation');
    
    const cashAmount = parseFloat(cashInput.value) || 0;
    const totalAmount = calculateTotal();
    const change = cashAmount - totalAmount;
    
    changeEl.textContent = formatCurrency(Math.max(0, change));
    
    // Update validation message
    if (cashAmount === 0) {
        validationEl.innerHTML = '<i class="fas fa-info-circle"></i><span>Masukkan jumlah uang</span>';
        validationEl.className = 'validation-message';
    } else if (change < 0) {
        const shortage = Math.abs(change);
        validationEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Uang kurang: ${formatCurrency(shortage)}</span>`;
        validationEl.className = 'validation-message text-error';
        changeEl.style.color = 'var(--error)';
    } else {
        validationEl.innerHTML = `<i class="fas fa-check-circle"></i><span>Uang cukup, kembalian: ${formatCurrency(change)}</span>`;
        validationEl.className = 'validation-message text-success';
        changeEl.style.color = 'var(--success)';
    }
}

function generateQRCode() {
    const totalAmount = calculateTotal();
    if (totalAmount === 0) return;
    
    const qrisCodeEl = document.getElementById('qrisCode');
    
    // Generate transaction ID
    const transactionId = 'TRX-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Create QR data (simplified for demo)
    const qrData = {
        merchant: "Nasi Daun Jeruk POS",
        amount: totalAmount,
        transactionId: transactionId,
        timestamp: new Date().toISOString(),
        items: state.cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.basePrice
        }))
    };
    
    // Convert to string
    const qrString = JSON.stringify(qrData);
    
    // Generate QR code using QRCode.js
    QRCode.toCanvas(qrString, {
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    }, function(error, canvas) {
        if (error) {
            console.error('QR Code generation failed:', error);
            showSimulatedQRCode();
        } else {
            qrisCodeEl.innerHTML = '';
            qrisCodeEl.appendChild(canvas);
            
            // Add merchant logo overlay
            const logo = document.createElement('div');
            logo.className = 'qris-logo-overlay';
            logo.innerHTML = '<i class="fas fa-leaf"></i>';
            qrisCodeEl.appendChild(logo);
        }
    });
}

function showSimulatedQRCode() {
    const qrisCodeEl = document.getElementById('qrisCode');
    const totalAmount = calculateTotal();
    
    qrisCodeEl.innerHTML = `
        <div class="qris-placeholder">
            <div class="qris-logo">
                <i class="fas fa-qrcode"></i>
            </div>
            <p>Total: ${formatCurrency(totalAmount)}</p>
            <small>Scan dengan aplikasi e-wallet</small>
            <div class="qr-pattern">
                <div>■ ■ ■ ■ ■</div>
                <div>■ □ □ □ ■</div>
                <div>■ □ ■ □ ■</div>
                <div>■ □ □ □ ■</div>
                <div>■ ■ ■ ■ ■</div>
            </div>
        </div>
    `;
}

function simulateQRISPayment() {
    if (state.cart.length === 0) {
        showAlert('Keranjang Kosong', 'Tambahkan item ke keranjang terlebih dahulu!', 'warning');
        return;
    }
    
    showAlert('Simulasi Pembayaran QRIS', 
        'Untuk demo: Bayar dengan meng-scan QR code di atas menggunakan aplikasi e-wallet.<br><br>Klik "Proses Transaksi" setelah pembayaran berhasil.', 
        'info');
}

function cancelQRISPayment() {
    document.querySelector('input[name="paymentMethod"][value="cash"]').checked = true;
    togglePaymentSection('cash');
    showToast('Pembayaran QRIS dibatalkan');
}

// ==================== TRANSACTION PROCESSING ====================
function processTransaction() {
    if (state.cart.length === 0) {
        showAlert('Keranjang Kosong', 'Tambahkan item ke keranjang terlebih dahulu!', 'warning');
        return;
    }
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const totalAmount = calculateTotal();
    
    // Validate cash payment
    if (paymentMethod === 'cash') {
        const cashAmount = parseFloat(document.getElementById('cashAmount').value) || 0;
        
        if (cashAmount === 0) {
            showAlert('Masukkan Jumlah', 'Masukkan jumlah uang yang dibayarkan.', 'warning');
            document.getElementById('cashAmount').focus();
            return;
        }
        
        if (cashAmount < totalAmount) {
            const shortage = totalAmount - cashAmount;
            showAlert('Uang Kurang', `Uang yang dibayarkan kurang ${formatCurrency(shortage)}. Silakan periksa kembali.`, 'error');
            document.getElementById('cashAmount').focus();
            return;
        }
    }
    
    // Create transaction
    const transaction = {
        id: 'TRX-' + Date.now(),
        timestamp: new Date().toISOString(),
        items: JSON.parse(JSON.stringify(state.cart)),
        subtotal: calculateSubtotal(),
        tax: 0,
        total: totalAmount,
        paymentMethod: paymentMethod,
        cashPaid: paymentMethod === 'cash' ? parseFloat(document.getElementById('cashAmount').value) : 0,
        change: paymentMethod === 'cash' ? Math.max(0, parseFloat(document.getElementById('cashAmount').value) - totalAmount) : 0,
        status: 'completed'
    };
    
    // Save transaction
    saveTransaction(transaction);
    
    // Update daily stats
    updateDailyStats(transaction);
    
    // Show success modal
    showTransactionSuccess(transaction);
    
    // Clear cart
    state.cart = [];
    saveCartToStorage();
    updateCartDisplay();
    updateCartSummary();
    updateQuickStats();
    
    // Reset cash input
    document.getElementById('cashAmount').value = '';
    calculateChange();
    
    // Play success sound
    if (state.settings.enableSounds) {
        playSound('successSound');
    }
}

function saveTransaction(transaction) {
    // Load existing transactions
    let transactions = JSON.parse(localStorage.getItem(CONFIG.storageKey + 'transactions')) || [];
    
    // Add new transaction
    transactions.push(transaction);
    
    // Save back to localStorage
    localStorage.setItem(CONFIG.storageKey + 'transactions', JSON.stringify(transactions));
    
    // Update state
    state.transactions = transactions;
    
    // Show toast
    showToast('Transaksi berhasil disimpan!', 'success');
}

function showTransactionSuccess(transaction) {
    const modal = document.getElementById('successModal');
    const detailsEl = document.getElementById('transactionDetails');
    
    // Build transaction details
    const paymentMethodText = transaction.paymentMethod === 'cash' ? 'Tunai' : 'QRIS';
    const changeText = transaction.paymentMethod === 'cash' ? 
        `Kembalian: ${formatCurrency(transaction.change)}` : 
        'Pembayaran digital berhasil';
    
    detailsEl.innerHTML = `
        <div class="transaction-detail">
            <strong>ID Transaksi:</strong> ${transaction.id}
        </div>
        <div class="transaction-detail">
            <strong>Tanggal:</strong> ${new Date(transaction.timestamp).toLocaleString('id-ID')}
        </div>
        <div class="transaction-detail">
            <strong>Metode Bayar:</strong> ${paymentMethodText}
        </div>
        <div class="transaction-detail">
            <strong>Total:</strong> ${formatCurrency(transaction.total)}
        </div>
        <div class="transaction-detail">
            <strong>Status:</strong> <span class="text-success">Berhasil</span>
        </div>
        <div class="transaction-detail">
            ${changeText}
        </div>
    `;
    
    // Show modal
    modal.style.display = 'flex';
}

// ==================== MENU FILTERING ====================
function filterMenuByCategory(category) {
    const menuItems = document.querySelectorAll('.menu-item');
    const categoryTabs = document.querySelectorAll('.category-tab');
    
    // Update active tab
    categoryTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });
    
    // Filter menu items
    menuItems.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function resetMenuFilters() {
    filterMenuByCategory('all');
    showToast('Filter menu direset');
}

// ==================== UTILITY FUNCTIONS ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

function updateQuickStats() {
    const cartTotal = calculateTotal();
    document.getElementById('cartTotal').textContent = formatCurrency(cartTotal);
}

function loadDailyStats() {
    const today = new Date().toDateString();
    const transactions = JSON.parse(localStorage.getItem(CONFIG.storageKey + 'transactions')) || [];
    
    const todayTransactions = transactions.filter(t => {
        return new Date(t.timestamp).toDateString() === today;
    });
    
    const todayIncome = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const qrisCount = todayTransactions.filter(t => t.paymentMethod === 'qris').length;
    const cashCount = todayTransactions.filter(t => t.paymentMethod === 'cash').length;
    
    state.dailyStats = {
        transactionCount: todayTransactions.length,
        totalIncome: todayIncome,
        cashTransactions: cashCount,
        qrisTransactions: qrisCount
    };
    
    updateFooterStats();
}

function updateDailyStats(transaction) {
    state.dailyStats.transactionCount++;
    state.dailyStats.totalIncome += transaction.total;
    
    if (transaction.paymentMethod === 'cash') {
        state.dailyStats.cashTransactions++;
    } else {
        state.dailyStats.qrisTransactions++;
    }
    
    updateFooterStats();
}

function updateFooterStats() {
    document.getElementById('todayTransactionCount').textContent = state.dailyStats.transactionCount;
    document.getElementById('todayIncome').textContent = formatCurrency(state.dailyStats.totalIncome);
    document.getElementById('totalTransactions').textContent = state.transactions.length;
}

function playSound(soundId) {
    if (!state.settings.enableSounds) return;
    
    const audio = document.getElementById(soundId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
}

function handleKeyboardShortcuts(e) {
    // Only trigger when not in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key.toLowerCase()) {
        case 'f5':
            e.preventDefault();
            showToast('Gunakan Ctrl+R untuk refresh');
            break;
        case 'escape':
            closeModal();
            closeAlert();
            break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
            const itemId = parseInt(e.key);
            if (MENU_ITEMS[itemId]) {
                addToCart(itemId);
            }
            break;
        case 'c':
            if (e.ctrlKey) {
                clearCart();
            }
            break;
        case 't':
            toggleTheme();
            break;
        case 'p':
            if (e.ctrlKey) {
                e.preventDefault();
                printReceipt();
            }
            break;
    }
}

// ==================== STORAGE FUNCTIONS ====================
function saveStateToStorage() {
    localStorage.setItem(CONFIG.storageKey + 'state', JSON.stringify(state));
}

function loadStateFromStorage() {
    const savedState = localStorage.getItem(CONFIG.storageKey + 'state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            state = { ...state, ...parsed };
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
}

function saveCartToStorage() {
    localStorage.setItem(CONFIG.storageKey + 'cart', JSON.stringify(state.cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem(CONFIG.storageKey + 'cart');
    if (savedCart) {
        try {
            state.cart = JSON.parse(savedCart);
        } catch (e) {
            console.error('Failed to load cart:', e);
            state.cart = [];
        }
    }
}

function loadTransactions() {
    const savedTransactions = localStorage.getItem(CONFIG.storageKey + 'transactions');
    if (savedTransactions) {
        try {
            state.transactions = JSON.parse(savedTransactions);
        } catch (e) {
            console.error('Failed to load transactions:', e);
            state.transactions = [];
        }
    }
}

// ==================== UI HELPERS ====================
function showAlert(title, message, type = 'info') {
    const modal = document.getElementById('alertModal');
    const titleEl = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    
    titleEl.textContent = title;
    messageEl.innerHTML = message;
    
    // Set modal header color
    const header = modal.querySelector('.modal-header');
    header.className = 'modal-header ' + type;
    
    modal.style.display = 'flex';
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

function closeModal() {
    document.getElementById('successModal').style.display = 'none';
}

function closeAlert() {
    document.getElementById('alertModal').style.display = 'none';
}

function newTransaction() {
    closeModal();
    showToast('Siap untuk transaksi baru!', 'success');
}

function saveTransaction() {
    if (state.cart.length === 0) {
        showToast('Keranjang kosong, tidak ada yang disimpan', 'warning');
        return;
    }
    
    const transactionDraft = {
        id: 'DRAFT-' + Date.now(),
        timestamp: new Date().toISOString(),
        items: JSON.parse(JSON.stringify(state.cart)),
        total: calculateTotal(),
        status: 'draft'
    };
    
    let drafts = JSON.parse(localStorage.getItem(CONFIG.storageKey + 'drafts')) || [];
    drafts.push(transactionDraft);
    localStorage.setItem(CONFIG.storageKey + 'drafts', JSON.stringify(drafts));
    
    showToast('Transaksi disimpan sebagai draft', 'success');
}

function cancelTransaction() {
    if (state.cart.length === 0) {
        showToast('Tidak ada transaksi untuk dibatalkan');
        return;
    }
    
    if (confirm('Batalkan transaksi ini? Item di keranjang akan dihapus.')) {
        clearCart();
        showToast('Transaksi dibatalkan');
    }
}

// ==================== PRINT FUNCTION ====================
function printReceipt() {
    if (state.cart.length === 0) {
        showAlert('Tidak ada struk', 'Tambahkan item ke keranjang terlebih dahulu.', 'warning');
        return;
    }
    
    const total = calculateTotal();
    const now = new Date();
    
    let receiptHTML = `
        <html>
        <head>
            <title>Struk Nasi Daun Jeruk</title>
            <style>
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { 
                        font-family: monospace; 
                        margin: 0; 
                        padding: 10px; 
                        width: 80mm; 
                        font-size: 12px;
                    }
                    .no-print { display: none !important; }
                }
                body { font-family: monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; }
                .receipt { width: 100%; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
                .header h2 { margin: 5px 0; font-size: 16px; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                .item { display: flex; justify-content: space-between; margin: 4px 0; }
                .item .quantity { width: 20px; text-align: center; }
                .item .name { flex: 1; margin-left: 5px; }
                .item .price { text-align: right; min-width: 60px; }
                .total { font-weight: bold; font-size: 14px; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000; }
                .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
                .thank-you { margin-top: 15px; text-align: center; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>NASI DAUN JERUK</h2>
                    <div>POS System v2.0</div>
                    <div>${now.toLocaleString('id-ID')}</div>
                    <div>ID: TRX-${Date.now().toString().slice(-6)}</div>
                </div>
                <div class="divider"></div>
    `;
    
    state.cart.forEach(item => {
        const itemTotal = item.basePrice * item.quantity;
        receiptHTML += `
            <div class="item">
                <div class="quantity">${item.quantity}x</div>
                <div class="name">${item.name}</div>
                <div class="price">Rp ${itemTotal.toLocaleString('id-ID')}</div>
            </div>
        `;
        if (item.topping) {
            receiptHTML += `<div style="margin-left: 25px; font-size: 10px;">Topping: ${item.topping.name}</div>`;
        }
    });
    
    receiptHTML += `
                <div class="divider"></div>
                <div class="item total">
                    <div>TOTAL</div>
                    <div>Rp ${total.toLocaleString('id-ID')}</div>
                </div>
                <div class="thank-you">TERIMA KASIH</div>
                <div class="footer">
                    <p>www.nasidaujeruk-pos.com</p>
                    <p>Untuk market day sekolah</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// ==================== GLOBAL EXPORTS ====================
// Make functions available globally for onclick handlers
window.addToCart = addToCart;
window.updateCartItem = updateCartItem;
window.removeCartItem = removeCartItem;
window.clearCart = clearCart;
window.togglePaymentSection = togglePaymentSection;
window.calculateChange = calculateChange;
window.simulateQRISPayment = simulateQRISPayment;
window.cancelQRISPayment = cancelQRISPayment;
window.processTransaction = processTransaction;
window.printReceipt = printReceipt;
window.saveTransaction = saveTransaction;
window.cancelTransaction = cancelTransaction;
window.newTransaction = newTransaction;
window.closeModal = closeModal;
window.closeAlert = closeAlert;
window.hideToast = hideToast;

console.log(`${CONFIG.appName} v${CONFIG.version} loaded successfully!`);