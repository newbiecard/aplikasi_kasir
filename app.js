class NasiDaunJerukPOS {
    constructor() {
        this.cart = [];
        this.transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        this.currentPaymentMethod = 'cash';
        
        this.init();
    }
    
    init() {
        this.loadCart();
        this.setupEventListeners();
        this.updateUI();
        this.checkBackupPage();
    }
    
    setupEventListeners() {
        // Add to cart buttons
        document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => this.addToCart(e));
        });
        
        // Payment method buttons
        document.getElementById('cashBtn').addEventListener('click', () => this.setPaymentMethod('cash'));
        document.getElementById('qrisBtn').addEventListener('click', () => this.setPaymentMethod('qris'));
        
        // Cash payment
        document.getElementById('cashAmount').addEventListener('input', () => this.calculateChange());
        document.getElementById('processCash').addEventListener('click', () => this.processCashPayment());
        
        // QRIS payment
        document.getElementById('completeQris').addEventListener('click', () => this.completeQrisPayment());
        document.getElementById('cancelQris').addEventListener('click', () => this.cancelQrisPayment());
        
        // Clear cart
        document.getElementById('clearCart').addEventListener('click', () => this.clearCart());
        
        // View backup
        document.getElementById('viewBackup').addEventListener('click', () => {
            window.location.href = 'backup.html';
        });
        
        // Modal controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        document.getElementById('closeReceipt').addEventListener('click', () => this.closeModal());
        document.getElementById('printReceipt').addEventListener('click', () => this.printReceipt());
        
        // Confirmation modal
        document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction(true));
        document.getElementById('confirmNo').addEventListener('click', () => this.confirmAction(false));
    }
    
    addToCart(event) {
        const menuCard = event.target.closest('.menu-card');
        const id = parseInt(menuCard.dataset.id);
        const price = parseInt(menuCard.dataset.price);
        const name = menuCard.querySelector('h3').textContent;
        
        let desc = '';
        if (id === 1) {
            const selectedTopping = menuCard.querySelector('input[name="topping_1"]:checked').value;
            desc = `Topping: ${selectedTopping}`;
        } else {
            desc = menuCard.querySelector('.menu-desc').textContent;
        }
        
        // Check if item already exists in cart (for customization)
        const existingIndex = this.cart.findIndex(item => 
            item.id === id && 
            (id !== 1 || item.desc === desc)
        );
        
        if (existingIndex > -1) {
            this.cart[existingIndex].quantity += 1;
        } else {
            this.cart.push({
                id,
                name,
                price,
                desc,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.updateUI();
        this.showToast(`${name} ditambahkan ke keranjang!`, 'success');
        
        // If QRIS is selected, update QR code
        if (this.currentPaymentMethod === 'qris') {
            this.updateQrisCode();
        }
    }
    
    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveCart();
        this.updateUI();
        
        if (this.currentPaymentMethod === 'qris') {
            this.updateQrisCode();
        }
    }
    
    updateQuantity(index, change) {
        const newQuantity = this.cart[index].quantity + change;
        
        if (newQuantity < 1) {
            this.removeFromCart(index);
        } else {
            this.cart[index].quantity = newQuantity;
            this.saveCart();
            this.updateUI();
            
            if (this.currentPaymentMethod === 'qris') {
                this.updateQrisCode();
            }
        }
    }
    
    clearCart() {
        if (this.cart.length === 0) return;
        
        this.showConfirmModal(
            'Apakah Anda yakin ingin menghapus semua item di keranjang?',
            () => {
                this.cart = [];
                this.saveCart();
                this.updateUI();
                this.showToast('Keranjang berhasil dikosongkan!', 'success');
            }
        );
    }
    
    calculateTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    calculateChange() {
        const total = this.calculateTotal();
        const cashInput = document.getElementById('cashAmount');
        const cashPaid = parseInt(cashInput.value) || 0;
        const cashChange = cashPaid - total;
        
        document.getElementById('cashTotal').textContent = `Rp${total.toLocaleString('id-ID')}`;
        document.getElementById('cashPaid').textContent = `Rp${cashPaid.toLocaleString('id-ID')}`;
        document.getElementById('cashChange').textContent = `Rp${cashChange.toLocaleString('id-ID')}`;
        
        const processBtn = document.getElementById('processCash');
        const validationMsg = document.getElementById('cashValidation');
        
        if (cashPaid < total) {
            processBtn.disabled = true;
            validationMsg.textContent = `Uang kurang: Rp${(total - cashPaid).toLocaleString('id-ID')}`;
            validationMsg.className = 'validation-message error';
        } else if (cashPaid === 0) {
            processBtn.disabled = true;
            validationMsg.textContent = 'Masukkan jumlah uang yang dibayarkan';
            validationMsg.className = 'validation-message error';
        } else {
            processBtn.disabled = false;
            validationMsg.textContent = 'Pembayaran valid, klik tombol proses untuk menyelesaikan transaksi';
            validationMsg.className = 'validation-message success';
        }
    }
    
    setPaymentMethod(method) {
        this.currentPaymentMethod = method;
        
        // Update button states
        document.getElementById('cashBtn').classList.toggle('active', method === 'cash');
        document.getElementById('qrisBtn').classList.toggle('active', method === 'qris');
        
        // Show/hide payment forms
        document.getElementById('cashPayment').classList.toggle('active', method === 'cash');
        document.getElementById('qrisPayment').classList.toggle('active', method === 'qris');
        
        if (method === 'qris') {
            this.updateQrisCode();
            document.getElementById('qrisStatus').innerHTML = 
                '<i class="fas fa-clock"></i> Menunggu pembayaran...';
            document.getElementById('qrisStatus').className = 'qris-status';
        }
    }
    
    processCashPayment() {
        const total = this.calculateTotal();
        const cashPaid = parseInt(document.getElementById('cashAmount').value) || 0;
        
        if (cashPaid < total) {
            this.showToast('Uang yang dibayarkan kurang!', 'error');
            return;
        }
        
        const transaction = {
            id: Date.now(),
            date: new Date().toISOString(),
            method: 'cash',
            items: [...this.cart],
            total,
            cashPaid,
            change: cashPaid - total
        };
        
        this.saveTransaction(transaction);
        this.showReceipt(transaction);
        this.resetTransaction();
        
        this.showToast('Transaksi tunai berhasil diproses!', 'success');
    }
    
    updateQrisCode() {
        const total = this.calculateTotal();
        if (window.generateQRIS) {
            window.generateQRIS(total);
        }
    }
    
    completeQrisPayment() {
        const total = this.calculateTotal();
        if (total === 0) {
            this.showToast('Keranjang kosong! Tambahkan item terlebih dahulu.', 'error');
            return;
        }
        
        const transaction = {
            id: Date.now(),
            date: new Date().toISOString(),
            method: 'qris',
            items: [...this.cart],
            total,
            cashPaid: total,
            change: 0
        };
        
        document.getElementById('qrisStatus').innerHTML = 
            '<i class="fas fa-check-circle"></i> Pembayaran berhasil!';
        document.getElementById('qrisStatus').className = 'qris-status success';
        
        setTimeout(() => {
            this.saveTransaction(transaction);
            this.showReceipt(transaction);
            this.resetTransaction();
            this.showToast('Transaksi QRIS berhasil diproses!', 'success');
        }, 1500);
    }
    
    cancelQrisPayment() {
        document.getElementById('qrisStatus').innerHTML = 
            '<i class="fas fa-times-circle"></i> Pembayaran dibatalkan';
        document.getElementById('qrisStatus').className = 'qris-status cancelled';
        this.showToast('Pembayaran QRIS dibatalkan', 'warning');
    }
    
    saveTransaction(transaction) {
        this.transactions.unshift(transaction);
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }
    
    showReceipt(transaction) {
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let itemsHtml = '';
        transaction.items.forEach(item => {
            itemsHtml += `
                <div class="receipt-item">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>${item.desc} x${item.quantity}</small>
                    </div>
                    <div>Rp${(item.price * item.quantity).toLocaleString('id-ID')}</div>
                </div>
            `;
        });
        
        const receiptHtml = `
            <div class="receipt">
                <div class="receipt-header">
                    <h3>Nasi Daun Jeruk</h3>
                    <p>Market Day</p>
                    <p>${formattedDate}</p>
                    <p>ID: ${transaction.id}</p>
                </div>
                
                <div class="receipt-details">
                    ${itemsHtml}
                </div>
                
                <div class="receipt-total">
                    <div class="receipt-item">
                        <span>Total:</span>
                        <span>Rp${transaction.total.toLocaleString('id-ID')}</span>
                    </div>
                    <div class="receipt-item">
                        <span>Metode:</span>
                        <span>${transaction.method === 'cash' ? 'Tunai' : 'QRIS'}</span>
                    </div>
                    ${transaction.method === 'cash' ? `
                        <div class="receipt-item">
                            <span>Uang Bayar:</span>
                            <span>Rp${transaction.cashPaid.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="receipt-item">
                            <span>Kembalian:</span>
                            <span>Rp${transaction.change.toLocaleString('id-ID')}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="receipt-footer">
                    <p>Terima kasih telah berbelanja di Nasi Daun Jeruk!</p>
                    <p>Semoga hari Anda menyenangkan</p>
                </div>
            </div>
        `;
        
        document.getElementById('receiptContent').innerHTML = receiptHtml;
        this.openModal('receiptModal');
    }
    
    printReceipt() {
        const printContent = document.getElementById('receiptContent').innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        
        // Reinitialize the app
        this.init();
    }
    
    resetTransaction() {
        this.cart = [];
        this.saveCart();
        this.updateUI();
        
        // Reset cash form
        document.getElementById('cashAmount').value = '';
        document.getElementById('processCash').disabled = true;
        document.getElementById('cashValidation').className = 'validation-message';
        
        // Reset QRIS
        if (window.generateQRIS) {
            window.generateQRIS(0);
        }
    }
    
    updateUI() {
        const cartItemsContainer = document.getElementById('cartItems');
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = this.calculateTotal();
        
        // Update cart display
        if (this.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Keranjang masih kosong</p>
                </div>
            `;
        } else {
            let cartHtml = '';
            this.cart.forEach((item, index) => {
                cartHtml += `
                    <div class="cart-item">
                        <div class="item-info">
                            <h4>${item.name}</h4>
                            <p class="item-desc">${item.desc}</p>
                        </div>
                        <div class="item-controls">
                            <span class="item-price">Rp${(item.price * item.quantity).toLocaleString('id-ID')}</span>
                            <div class="quantity-control">
                                <button class="quantity-btn minus" onclick="app.updateQuantity(${index}, -1)">-</button>
                                <span class="quantity">${item.quantity}</span>
                                <button class="quantity-btn plus" onclick="app.updateQuantity(${index}, 1)">+</button>
                            </div>
                            <button class="delete-item" onclick="app.removeFromCart(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            cartItemsContainer.innerHTML = cartHtml;
        }
        
        // Update totals
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('totalPrice').textContent = `Rp${totalPrice.toLocaleString('id-ID')}`;
        document.getElementById('cashTotal').textContent = `Rp${totalPrice.toLocaleString('id-ID')}`;
        
        // Calculate change if cash input exists
        if (document.getElementById('cashAmount').value) {
            this.calculateChange();
        }
    }
    
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }
    
    loadCart() {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
        }
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
    
    checkBackupPage() {
        // If we're on the backup page, don't run the POS functionality
        if (window.location.pathname.includes('backup.html')) {
            return;
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NasiDaunJerukPOS();
    window.app = app; // Make app available globally for HTML onclick handlers
});