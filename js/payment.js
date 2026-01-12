// Payment-specific functionality for Nasi Daun Jeruk POS v3

const paymentEnhancements = {
    // Payment methods configuration
    methods: {
        cash: {
            name: 'Tunai',
            icon: 'fa-money-bill-wave',
            color: '#4CAF50',
            requiresValidation: true,
            validationType: 'amount'
        },
        qris: {
            name: 'QRIS',
            icon: 'fa-qrcode',
            color: '#2196F3',
            requiresValidation: false,
            validationType: 'none'
        }
    },
    
    // Payment status tracking
    status: {
        currentPayment: null,
        isProcessing: false,
        timeoutId: null
    },
    
    // Initialize payment enhancements
    init: () => {
        console.log('Payment enhancements initialized');
        
        // Add payment method badges
        paymentEnhancements.addPaymentBadges();
        
        // Add payment history tracking
        paymentEnhancements.initPaymentHistory();
        
        // Add receipt customization
        paymentEnhancements.initReceiptCustomization();
        
        // Add payment analytics
        paymentEnhancements.initPaymentAnalytics();
        
        // Add offline payment support
        paymentEnhancements.initOfflineSupport();
    },
    
    // Add visual badges to payment methods
    addPaymentBadges: () => {
        const methodTabs = document.querySelectorAll('.method-tab');
        
        methodTabs.forEach(tab => {
            const method = tab.dataset.method;
            const methodConfig = paymentEnhancements.methods[method];
            
            if (methodConfig) {
                // Add badge for QRIS
                if (method === 'qris') {
                    const badge = document.createElement('span');
                    badge.className = 'method-badge';
                    badge.innerHTML = '<i class="fas fa-bolt"></i> Cepat';
                    badge.style.cssText = `
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: #FF9800;
                        color: white;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-weight: bold;
                    `;
                    tab.style.position = 'relative';
                    tab.appendChild(badge);
                }
                
                // Add tooltip
                tab.title = method === 'qris' 
                    ? 'Bayar cepat dengan scan QR code' 
                    : 'Bayar dengan uang tunai';
            }
        });
    },
    
    // Initialize payment history tracking
    initPaymentHistory: () => {
        // Track payment method preferences
        const trackPaymentMethod = (method) => {
            const history = JSON.parse(localStorage.getItem('paymentHistory') || '{}');
            
            history[method] = (history[method] || 0) + 1;
            history.lastUsed = method;
            history.lastUsedTime = new Date().toISOString();
            
            localStorage.setItem('paymentHistory', JSON.stringify(history));
            
            // Update payment analytics
            paymentEnhancements.updatePaymentAnalytics();
        };
        
        // Listen for payment method changes
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const method = this.dataset.method;
                trackPaymentMethod(method);
            });
        });
        
        // Track actual payments
        const originalProcessPayment = paymentManager.processPayment;
        paymentManager.processPayment = function() {
            const method = paymentManager.currentMethod;
            trackPaymentMethod(method);
            return originalProcessPayment.apply(this, arguments);
        };
    },
    
    // Initialize receipt customization based on payment method
    initReceiptCustomization: () => {
        // Customize receipt based on payment method
        const customizeReceipt = (transaction, receiptElement) => {
            const method = transaction.payment.method;
            
            if (method === 'qris') {
                // Add QRIS-specific information
                const qrisSection = receiptElement.querySelector('.receipt-qris');
                if (qrisSection) {
                    // Add transaction time and merchant info
                    const qrisInfo = document.createElement('div');
                    qrisInfo.className = 'qris-details';
                    qrisInfo.innerHTML = `
                        <div style="margin-top: 10px; font-size: 11px;">
                            <div>Merchant: Nasi Daun Jeruk Official</div>
                            <div>MID: NDJ${transaction.id.substr(-6)}</div>
                            <div>Status: SUCCESS</div>
                            <div>Timestamp: ${new Date(transaction.date).toLocaleTimeString('id-ID')}</div>
                        </div>
                    `;
                    qrisSection.appendChild(qrisInfo);
                }
                
                // Add QR code to receipt
                const receiptBody = receiptElement.querySelector('.receipt-body');
                if (receiptBody && typeof QRCode !== 'undefined') {
                    const qrContainer = document.createElement('div');
                    qrContainer.className = 'receipt-qr';
                    qrContainer.style.cssText = `
                        text-align: center;
                        margin: 15px 0;
                        padding: 10px;
                        border: 1px dashed #ddd;
                    `;
                    
                    const qrCanvas = document.createElement('canvas');
                    qrContainer.appendChild(qrCanvas);
                    
                    // Insert before footer
                    const footer = receiptBody.querySelector('.receipt-footer');
                    if (footer) {
                        receiptBody.insertBefore(qrContainer, footer);
                    }
                    
                    // Generate QR code with transaction info
                    setTimeout(() => {
                        try {
                            QRCode.toCanvas(qrCanvas, JSON.stringify({
                                t: transaction.id,
                                a: transaction.total,
                                m: 'Nasi Daun Jeruk',
                                d: transaction.date
                            }), {
                                width: 120,
                                height: 120,
                                margin: 1
                            });
                        } catch (error) {
                            console.log('QR code generation skipped for receipt');
                        }
                    }, 100);
                }
            }
            
            // Add payment method icon to receipt header
            const receiptHeader = receiptElement.querySelector('.receipt-header');
            if (receiptHeader) {
                const methodIcon = document.createElement('div');
                methodIcon.className = 'receipt-method-icon';
                methodIcon.innerHTML = `
                    <i class="fas fa-${method === 'qris' ? 'qrcode' : 'money-bill'}"></i>
                    <span>${method === 'qris' ? 'QRIS' : 'TUNAI'}</span>
                `;
                methodIcon.style.cssText = `
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: ${method === 'qris' ? '#2196F3' : '#4CAF50'};
                    color: white;
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                `;
                
                receiptHeader.style.position = 'relative';
                receiptHeader.appendChild(methodIcon);
            }
        };
        
        // Override receipt showing to add customization
        const originalShowReceipt = receiptManager.showReceipt;
        receiptManager.showReceipt = function(transaction) {
            originalShowReceipt.call(this, transaction);
            
            // Wait for modal to be populated
            setTimeout(() => {
                const receiptModal = document.querySelector('.receipt-modal');
                if (receiptModal) {
                    customizeReceipt(transaction, receiptModal);
                }
            }, 100);
        };
    },
    
    // Initialize payment analytics
    initPaymentAnalytics: () => {
        // Create analytics dashboard
        const createAnalyticsDashboard = () => {
            const history = JSON.parse(localStorage.getItem('paymentHistory') || '{}');
            const transactions = state.transactions || [];
            
            // Calculate statistics
            const stats = {
                totalPayments: transactions.length,
                cashPayments: transactions.filter(t => t.payment.method === 'cash').length,
                qrisPayments: transactions.filter(t => t.payment.method === 'qris').length,
                cashAmount: transactions.filter(t => t.payment.method === 'cash')
                    .reduce((sum, t) => sum + t.total, 0),
                qrisAmount: transactions.filter(t => t.payment.method === 'qris')
                    .reduce((sum, t) => sum + t.total, 0),
                averageCash: 0,
                averageQris: 0
            };
            
            if (stats.cashPayments > 0) {
                stats.averageCash = stats.cashAmount / stats.cashPayments;
            }
            
            if (stats.qrisPayments > 0) {
                stats.averageQris = stats.qrisAmount / stats.qrisPayments;
            }
            
            // Method preference from history
            const methodCounts = {
                cash: history.cash || 0,
                qris: history.qris || 0
            };
            const totalMethods = methodCounts.cash + methodCounts.qris;
            
            return {
                stats: stats,
                preferences: {
                    cash: totalMethods > 0 ? (methodCounts.cash / totalMethods) * 100 : 0,
                    qris: totalMethods > 0 ? (methodCounts.qris / totalMethods) * 100 : 0
                },
                history: history
            };
        };
        
        // Update analytics display
        paymentEnhancements.updatePaymentAnalytics = () => {
            const analytics = createAnalyticsDashboard();
            
            // Update stats in reports page if available
            const statsElements = {
                cashCount: document.getElementById('cashStatsCount'),
                cashAmount: document.getElementById('cashStatsAmount'),
                qrisCount: document.getElementById('qrisStatsCount'),
                qrisAmount: document.getElementById('qrisStatsAmount'),
                cashAvg: document.getElementById('cashStatsAvg'),
                qrisAvg: document.getElementById('qrisStatsAvg')
            };
            
            Object.keys(statsElements).forEach(key => {
                const element = statsElements[key];
                if (element) {
                    if (key.includes('Count')) {
                        const method = key.includes('cash') ? 'cashPayments' : 'qrisPayments';
                        element.textContent = analytics.stats[method];
                    } else if (key.includes('Amount')) {
                        const method = key.includes('cash') ? 'cashAmount' : 'qrisAmount';
                        element.textContent = utils.formatCurrency(analytics.stats[method]);
                    } else if (key.includes('Avg')) {
                        const method = key.includes('cash') ? 'averageCash' : 'averageQris';
                        element.textContent = utils.formatCurrency(Math.round(analytics.stats[method]));
                    }
                }
            });
        };
        
        // Add analytics section to reports page
        const addAnalyticsSection = () => {
            const reportsPage = document.getElementById('reportsPage');
            if (!reportsPage) return;
            
            // Check if analytics section already exists
            if (document.getElementById('paymentAnalytics')) return;
            
            const analyticsSection = document.createElement('div');
            analyticsSection.id = 'paymentAnalytics';
            analyticsSection.className = 'payment-analytics card';
            analyticsSection.innerHTML = `
                <h3><i class="fas fa-chart-pie"></i> Analisis Pembayaran</h3>
                <div class="analytics-grid">
                    <div class="analytics-card cash">
                        <div class="analytics-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="analytics-content">
                            <div class="analytics-value" id="cashStatsCount">0</div>
                            <div class="analytics-label">Transaksi Tunai</div>
                            <div class="analytics-sub">
                                Total: <span id="cashStatsAmount">Rp 0</span>
                            </div>
                            <div class="analytics-sub">
                                Rata-rata: <span id="cashStatsAvg">Rp 0</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-card qris">
                        <div class="analytics-icon">
                            <i class="fas fa-qrcode"></i>
                        </div>
                        <div class="analytics-content">
                            <div class="analytics-value" id="qrisStatsCount">0</div>
                            <div class="analytics-label">Transaksi QRIS</div>
                            <div class="analytics-sub">
                                Total: <span id="qrisStatsAmount">Rp 0</span>
                            </div>
                            <div class="analytics-sub">
                                Rata-rata: <span id="qrisStatsAvg">Rp 0</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="preference-chart">
                    <h4>Preferensi Metode Pembayaran</h4>
                    <div class="chart-bars">
                        <div class="chart-bar cash-bar">
                            <div class="bar-label">Tunai</div>
                            <div class="bar-container">
                                <div class="bar-fill" id="cashPreferenceBar" style="width: 0%"></div>
                            </div>
                            <div class="bar-value" id="cashPreferenceValue">0%</div>
                        </div>
                        <div class="chart-bar qris-bar">
                            <div class="bar-label">QRIS</div>
                            <div class="bar-container">
                                <div class="bar-fill" id="qrisPreferenceBar" style="width: 0%"></div>
                            </div>
                            <div class="bar-value" id="qrisPreferenceValue">0%</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Style the analytics section
            const style = document.createElement('style');
            style.textContent = `
                .payment-analytics {
                    margin-bottom: 20px;
                }
                
                .analytics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin: 15px 0;
                }
                
                .analytics-card {
                    padding: 15px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .analytics-card.cash {
                    background: linear-gradient(135deg, #4CAF50, #2E7D32);
                    color: white;
                }
                
                .analytics-card.qris {
                    background: linear-gradient(135deg, #2196F3, #0D47A1);
                    color: white;
                }
                
                .analytics-icon {
                    font-size: 2rem;
                    opacity: 0.9;
                }
                
                .analytics-value {
                    font-size: 1.8rem;
                    font-weight: bold;
                }
                
                .analytics-label {
                    font-size: 0.9rem;
                    opacity: 0.9;
                    margin-bottom: 5px;
                }
                
                .analytics-sub {
                    font-size: 0.8rem;
                    opacity: 0.8;
                }
                
                .preference-chart {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                
                .chart-bars {
                    margin-top: 10px;
                }
                
                .chart-bar {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    gap: 10px;
                }
                
                .bar-label {
                    width: 60px;
                    font-weight: bold;
                }
                
                .bar-container {
                    flex: 1;
                    height: 20px;
                    background: #f0f0f0;
                    border-radius: 10px;
                    overflow: hidden;
                }
                
                .bar-fill {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 1s ease;
                }
                
                .cash-bar .bar-fill {
                    background: #4CAF50;
                }
                
                .qris-bar .bar-fill {
                    background: #2196F3;
                }
                
                .bar-value {
                    width: 50px;
                    text-align: right;
                    font-weight: bold;
                }
            `;
            
            document.head.appendChild(style);
            
            // Insert after sales chart
            const salesChart = document.querySelector('.sales-chart');
            if (salesChart) {
                salesChart.parentNode.insertBefore(analyticsSection, salesChart.nextSibling);
            } else {
                const statsOverview = document.querySelector('.stats-overview');
                if (statsOverview) {
                    statsOverview.parentNode.insertBefore(analyticsSection, statsOverview.nextSibling);
                }
            }
            
            // Update analytics
            paymentEnhancements.updatePaymentAnalytics();
        };
        
        // Add analytics section when reports page is loaded
        const observer = new MutationObserver((mutations) => {
            if (document.getElementById('reportsPage')?.classList.contains('active')) {
                addAnalyticsSection();
                paymentEnhancements.updatePaymentAnalytics();
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    },
    
    // Initialize offline payment support
    initOfflineSupport: () => {
        // Store pending transactions when offline
        const pendingTransactionsKey = 'pendingTransactions';
        
        const savePendingTransaction = (transaction) => {
            const pending = JSON.parse(localStorage.getItem(pendingTransactionsKey) || '[]');
            transaction.offline = true;
            transaction.pendingId = `PENDING-${Date.now()}`;
            pending.push(transaction);
            localStorage.setItem(pendingTransactionsKey, JSON.stringify(pending));
            
            return transaction.pendingId;
        };
        
        const syncPendingTransactions = () => {
            const pending = JSON.parse(localStorage.getItem(pendingTransactionsKey) || '[]');
            
            if (pending.length > 0 && navigator.onLine) {
                console.log(`Syncing ${pending.length} pending transactions...`);
                
                pending.forEach((transaction, index) => {
                    // Add to regular transactions
                    state.transactions.unshift(transaction);
                    
                    // Update reports
                    reportManager.updateReports();
                    
                    // Show notification
                    setTimeout(() => {
                        utils.showNotification(
                            `Transaksi offline #${index + 1} disinkronkan`,
                            'success'
                        );
                    }, index * 1000);
                });
                
                // Clear pending transactions
                localStorage.removeItem(pendingTransactionsKey);
                
                // Save to localStorage
                utils.saveToLocalStorage();
                
                // Update UI
                reportManager.updateRecentTransactions();
                reportManager.loadTransactions();
                
                utils.showNotification(
                    `${pending.length} transaksi offline berhasil disinkronkan`,
                    'success',
                    5000
                );
            }
        };
        
        // Check network status
        const updateNetworkStatus = () => {
            const isOnline = navigator.onLine;
            const indicator = document.getElementById('networkStatus') || 
                            (() => {
                                const el = document.createElement('div');
                                el.id = 'networkStatus';
                                el.style.cssText = `
                                    position: fixed;
                                    bottom: 70px;
                                    right: 20px;
                                    padding: 8px 12px;
                                    border-radius: 20px;
                                    font-size: 12px;
                                    font-weight: bold;
                                    z-index: 1000;
                                    display: flex;
                                    align-items: center;
                                    gap: 5px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                                `;
                                document.body.appendChild(el);
                                return el;
                            })();
            
            if (isOnline) {
                indicator.innerHTML = '<i class="fas fa-wifi"></i> Online';
                indicator.style.background = '#4CAF50';
                indicator.style.color = 'white';
                
                // Try to sync pending transactions
                syncPendingTransactions();
            } else {
                indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
                indicator.style.background = '#F44336';
                indicator.style.color = 'white';
                
                // Show offline mode warning
                if (!window.offlineWarningShown) {
                    utils.showNotification(
                        'Mode offline aktif. Transaksi akan disimpan lokal.',
                        'warning',
                        5000
                    );
                    window.offlineWarningShown = true;
                }
            }
        };
        
        // Override payment processing for offline support
        const originalCompleteTransaction = paymentManager.completeTransaction;
        paymentManager.completeTransaction = function(transaction) {
            if (!navigator.onLine) {
                // Save as pending transaction
                const pendingId = savePendingTransaction(transaction);
                
                // Show pending notification
                utils.showNotification(
                    `Transaksi disimpan offline (ID: ${pendingId})`,
                    'info',
                    5000
                );
                
                // Clear cart and reset UI
                state.cart.items = [];
                cartManager.updateCart();
                elements.cashAmount.value = '';
                elements.cashChange.style.display = 'none';
                
                if (paymentManager.currentMethod === 'qris') {
                    paymentManager.cancelQrisPayment();
                }
                
                // Update recent transactions with pending
                reportManager.updateRecentTransactions();
                
                return;
            }
            
            // Process normally if online
            originalCompleteTransaction.call(this, transaction);
        };
        
        // Initialize network status
        updateNetworkStatus();
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        
        // Check for pending transactions on startup
        setTimeout(syncPendingTransactions, 2000);
    },
    
    // Enhanced payment validation
    validateEnhancedPayment: (method, amount, cartTotal) => {
        const validations = {
            cash: () => {
                if (amount < cartTotal) {
                    return {
                        valid: false,
                        message: 'Uang pembayaran kurang',
                        details: `Kurang Rp ${(cartTotal - amount).toLocaleString('id-ID')}`
                    };
                }
                
                // Check for large denominations
                if (amount >= 100000) {
                    return {
                        valid: true,
                        message: 'Pembayaran dengan uang besar terdeteksi',
                        warning: 'Pastikan kembalian tersedia',
                        details: `Kembalian: Rp ${(amount - cartTotal).toLocaleString('id-ID')}`
                    };
                }
                
                return { valid: true };
            },
            
            qris: () => {
                // Simulate QRIS validation
                const qrisLimits = {
                    min: 1000,
                    max: 10000000
                };
                
                if (cartTotal < qrisLimits.min) {
                    return {
                        valid: false,
                        message: 'Minimum pembayaran QRIS adalah Rp 1.000'
                    };
                }
                
                if (cartTotal > qrisLimits.max) {
                    return {
                        valid: false,
                        message: 'Maksimum pembayaran QRIS adalah Rp 10.000.000'
                    };
                }
                
                // Check for round amounts (common in QRIS)
                if (cartTotal % 100 !== 0) {
                    return {
                        valid: true,
                        message: 'Jumlah tidak bulat',
                        warning: 'Beberapa bank mungkin membulatkan ke atas',
                        details: `Jumlah: Rp ${cartTotal.toLocaleString('id-ID')}`
                    };
                }
                
                return { valid: true };
            }
        };
        
        return validations[method] ? validations[method]() : { valid: false, message: 'Metode tidak valid' };
    },
    
    // Get payment method recommendations
    getPaymentRecommendations: (cartTotal) => {
        const recommendations = [];
        const history = JSON.parse(localStorage.getItem('paymentHistory') || '{}');
        
        // Based on amount
        if (cartTotal < 5000) {
            recommendations.push({
                method: 'cash',
                reason: 'Pembayaran kecil lebih cepat dengan tunai',
                priority: 1
            });
        } else if (cartTotal > 50000) {
            recommendations.push({
                method: 'qris',
                reason: 'Pembayaran besar lebih aman dengan QRIS',
                priority: 1
            });
        }
        
        // Based on time of day
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 6) {
            recommendations.push({
                method: 'qris',
                reason: 'Malam hari - QRIS lebih praktis',
                priority: 2
            });
        }
        
        // Based on customer history
        const lastMethod = history.lastUsed;
        if (lastMethod) {
            recommendations.push({
                method: lastMethod,
                reason: 'Berdasarkan preferensi sebelumnya',
                priority: 3
            });
        }
        
        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);
        
        return recommendations;
    },
    
    // Simulate payment processing with enhanced feedback
    simulatePaymentProcessing: (method, amount) => {
        return new Promise((resolve) => {
            let steps = [];
            let duration = 2000;
            
            if (method === 'cash') {
                steps = [
                    { message: 'Memvalidasi uang...', duration: 800 },
                    { message: 'Menghitung kembalian...', duration: 600 },
                    { message: 'Mencetak struk...', duration: 600 }
                ];
            } else if (method === 'qris') {
                steps = [
                    { message: 'Membuat QR code...', duration: 500 },
                    { message: 'Menunggu pembayaran...', duration: 1000 },
                    { message: 'Memverifikasi pembayaran...', duration: 500 },
                    { message: 'Mencetak struk digital...', duration: 500 }
                ];
                duration = 2500;
            }
            
            // Show processing animation
            const showProcessing = (stepIndex) => {
                if (stepIndex >= steps.length) {
                    resolve(true);
                    return;
                }
                
                const step = steps[stepIndex];
                utils.showNotification(step.message, 'info', step.duration);
                
                setTimeout(() => {
                    showProcessing(stepIndex + 1);
                }, step.duration);
            };
            
            showProcessing(0);
        });
    }
};

// Initialize payment enhancements when app is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        paymentEnhancements.init();
    }, 1500);
});

// Export for global access
window.PaymentEnhancements = paymentEnhancements;
