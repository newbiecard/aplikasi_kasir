// QRIS Simulator dengan QR Code STATIC untuk Market Day
class QRISSimulator {
    constructor() {
        this.container = document.querySelector('.qris-container');
        this.init();
    }
    
    init() {
        // Generate tampilan QR static
        this.generateStaticQR();
    }
    
    generateStaticQR() {
        // Hapus canvas yang lama
        const canvas = document.getElementById('qrisCanvas');
        if (canvas) canvas.style.display = 'none';
        
        // Buat container QR static
        this.container.innerHTML = `
            <div class="qris-static-container">
                <div class="qris-static-header">
                    <h4>QRIS Pembayaran</h4>
                    <p class="qris-static-subtitle">Nasi Daun Jeruk Market Day</p>
                </div>
                
                <div class="qris-static-code">
                    <!-- GANTI GAMBAR INI DENGAN QR CODE ASLI KAMU -->
                    <img src="assets/qris-static.jpg" alt="QR Code Pembayaran" 
                         class="qris-static-image" id="staticQRImage">
                    
                    <!-- Fallback kalo gambar gak ada -->
                    <div class="qris-fallback" id="qrFallback">
                        <div class="qr-placeholder">
                            <div class="qr-corner tl"></div>
                            <div class="qr-corner tr"></div>
                            <div class="qr-corner bl"></div>
                            
                            <!-- Pattern QR simulasi -->
                            <div class="qr-pattern">
                                ${this.generateQRPattern()}
                            </div>
                            
                            <div class="qr-text">QRIS</div>
                        </div>
                    </div>
                </div>
                
                <div class="qris-static-amount">
                    <p>Total Pembayaran:</p>
                    <h3 id="staticQRAmount">Rp0</h3>
                </div>
                
                <div class="qris-static-instruction">
                    <p><i class="fas fa-mobile-alt"></i> Scan dengan kamera smartphone</p>
                    <div class="payment-apps">
                        <div class="payment-app">
                            <img src="assets/gopay-logo.png" alt="GoPay">
                            <span>GoPay</span>
                        </div>
                        <div class="payment-app">
                            <img src="assets/dana-logo.png" alt="DANA">
                            <span>DANA</span>
                        </div>
                        <div class="payment-app">
                            <i class="fas fa-university"></i>
                            <span>Bank App</span>
                        </div>
                        <div class="payment-app">
                            <i class="fas fa-camera"></i>
                            <span>Camera</span>
                        </div>
                    </div>
                    <p class="small-text">*Kasir akan memasukkan total secara manual</p>
                </div>
                
                <div class="qris-static-info">
                    <div class="info-item">
                        <i class="fas fa-store"></i>
                        <span>Merchant: Nasi Daun Jeruk</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span>Event: Market Day School</span>
                    </div>
                </div>
            </div>
        `;
        
        // Cek apakah gambar QR ada
        this.checkQRImage();
    }
    
    generateQRPattern() {
        // Generate pattern untuk fallback QR
        let pattern = '';
        const size = 7;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Buat pattern acak untuk placeholder
                if ((i === 0 || i === size-1 || j === 0 || j === size-1) || 
                    (i > 1 && i < size-2 && j > 1 && j < size-2 && Math.random() > 0.5)) {
                    pattern += `<div class="qr-dot" style="top: ${i*12}px; left: ${j*12}px;"></div>`;
                }
            }
        }
        
        return pattern;
    }
    
    checkQRImage() {
        const img = document.getElementById('staticQRImage');
        const fallback = document.getElementById('qrFallback');
        
        if (img) {
            // Cek apakah gambar berhasil load
            img.onerror = () => {
                img.style.display = 'none';
                if (fallback) fallback.style.display = 'block';
            };
            
            img.onload = () => {
                if (fallback) fallback.style.display = 'none';
            };
        }
    }
    
    generate(amount) {
        // Update amount yang ditampilkan
        const amountElement = document.getElementById('staticQRAmount');
        if (amountElement) {
            amountElement.textContent = `Rp${amount.toLocaleString('id-ID')}`;
        }
        
        // Update title dengan amount
        const titleElement = this.container.querySelector('.qris-static-subtitle');
        if (titleElement && amount > 0) {
            titleElement.innerHTML = `Total: <strong>Rp${amount.toLocaleString('id-ID')}</strong>`;
        }
    }
}

// Initialize ketika DOM siap
document.addEventListener('DOMContentLoaded', () => {
    window.qrisSimulator = new QRISSimulator();
    
    // Expose generate function globally
    window.generateQRIS = (amount) => {
        if (window.qrisSimulator) {
            window.qrisSimulator.generate(amount);
        }
    };
    
    // Generate initial QR dengan amount 0
    window.generateQRIS(0);
});