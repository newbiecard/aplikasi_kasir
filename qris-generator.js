// QRIS Generator Module

class QRISGenerator {
    constructor() {
        this.qrisData = {
            merchantName: "Nasi Daun Jeruk POS",
            merchantCity: "Jakarta",
            merchantId: "NDJPOS001",
            currency: "IDR"
        };
    }
    
    generatePayload(amount, transactionId) {
        // Generate QRIS standard payload (simplified version)
        const payload = {
            "00": "01", // Payload Format Indicator
            "01": "11", // Point of Initiation Method
            "52": "7000", // Merchant Category Code (Restaurant)
            "53": "360", // Currency (IDR)
            "54": amount.toFixed(2), // Transaction Amount
            "58": "ID", // Country Code
            "59": this.qrisData.merchantName, // Merchant Name
            "60": this.qrisData.merchantCity, // Merchant City
            "61": this.qrisData.merchantId, // Merchant ID
            "62": { // Additional Data Field Template
                "07": transactionId // Reference ID
            }
        };
        
        // Convert to string format
        let qrisString = "";
        for (const [key, value] of Object.entries(payload)) {
            if (typeof value === 'object') {
                let subString = "";
                for (const [subKey, subValue] of Object.entries(value)) {
                    subString += `${subKey}${subValue.length.toString().padStart(2, '0')}${subValue}`;
                }
                qrisString += `${key}${subString.length.toString().padStart(2, '0')}${subString}`;
            } else {
                qrisString += `${key}${value.length.toString().padStart(2, '0')}${value}`;
            }
        }
        
        return qrisString;
    }
    
    generateQRCode(amount, transactionId) {
        try {
            const payload = this.generatePayload(amount, transactionId);
            
            // Return QRIS data structure
            return {
                success: true,
                payload: payload,
                amount: amount,
                transactionId: transactionId,
                timestamp: new Date().toISOString(),
                qrType: "QRIS",
                supportedApps: ["GoPay", "DANA", "OVO", "ShopeePay", "LinkAja"]
            };
        } catch (error) {
            console.error("QRIS Generation Error:", error);
            return {
                success: false,
                error: error.message,
                fallback: this.generateFallbackQR(amount)
            };
        }
    }
    
    generateFallbackQR(amount) {
        // Fallback static QR for demo purposes
        return {
            type: "static",
            amount: amount,
            instruction: `Bayar ke: Nasi Daun Jeruk POS\nJumlah: Rp ${amount.toLocaleString('id-ID')}\n\nManual Payment Instruction`,
            note: "Gunakan aplikasi e-wallet dengan fitur QRIS"
        };
    }
    
    validatePayment(transactionData) {
        // Simulate payment validation
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    validated: true,
                    transactionId: transactionData.transactionId,
                    validatedAt: new Date().toISOString(),
                    status: "PAID"
                });
            }, 1000);
        });
    }
}

// Global instance
window.qrisGenerator = new QRISGenerator();