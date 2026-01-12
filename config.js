// ============================================
// ZETA POS ULTRA - CONFIGURATION
// App configuration and constants
// ============================================

const AppConfig = {
    // App Info
    APP_NAME: 'Nasi Daun Jeruk POS',
    APP_VERSION: '2.0.0',
    APP_AUTHOR: 'ZETA Systems',
    
    // Google Sheets Configuration
    DEFAULT_CONFIG: {
        scriptUrl: '',
        spreadsheetId: '',
        syncInterval: 30000,
        autoPrint: false,
        taxRate: 0,
        currency: 'IDR'
    },
    
    // Menu Configuration
    MENU_CATEGORIES: {
        nasi: 'Nasi Daun Jeruk',
        topping: 'Topping Tambahan',
        minuman: 'Minuman'
    },
    
    // Payment Methods
    PAYMENT_METHODS: [
        { id: 'cash', name: 'Tunai', icon: 'fa-money-bill-wave' },
        { id: 'qris', name: 'QRIS', icon: 'fa-qrcode' },
        { id: 'bank', name: 'Transfer Bank', icon: 'fa-university' }
    ],
    
    // Printer Settings
    PRINTER_SETTINGS: {
        paperWidth: 80,
        fontSize: 'normal',
        margin: 2,
        logo: true,
        footerText: 'Terima kasih telah berbelanja!'
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        CONFIG: 'zeta_pos_config_v2',
        TRANSACTIONS: 'zeta_transactions_v2',
        SYNC_QUEUE: 'zeta_sync_queue_v2',
        STATS: 'zeta_stats_v2'
    },
    
    // API Endpoints (if using custom backend)
    API_ENDPOINTS: {
        test: '/api/test',
        save: '/api/save',
        stats: '/api/stats'
    },
    
    // Theme Settings
    THEME: {
        primary: '#10B981',
        secondary: '#3B82F6',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#6366F1',
        dark: '#1F2937',
        light: '#F9FAFB'
    },
    
    // Feature Flags
    FEATURES: {
        offlineMode: true,
        autoSync: true,
        receiptPrinting: true,
        multiLanguage: false,
        inventoryTracking: false,
        customerManagement: false
    },
    
    // Validation Rules
    VALIDATION: {
        minOrderAmount: 1000,
        maxOrderAmount: 1000000,
        maxItemsPerOrder: 50,
        maxQuantityPerItem: 99
    },
    
    // Date/Time Format
    DATETIME_FORMAT: {
        date: 'dd/MM/yyyy',
        time: 'HH:mm:ss',
        datetime: 'dd/MM/yyyy HH:mm:ss'
    }
};

// Initialize configuration
function initializeConfig() {
    // Load saved config or use defaults
    const savedConfig = localStorage.getItem(AppConfig.STORAGE_KEYS.CONFIG);
    
    if (savedConfig) {
        try {
            return { ...AppConfig.DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
        } catch (error) {
            console.error('Error loading config:', error);
            return AppConfig.DEFAULT_CONFIG;
        }
    }
    
    return AppConfig.DEFAULT_CONFIG;
}

// Save configuration
function saveConfig(config) {
    try {
        localStorage.setItem(AppConfig.STORAGE_KEYS.CONFIG, JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
}

// Export configuration
window.AppConfig = AppConfig;
window.initializeConfig = initializeConfig;
window.saveConfig = saveConfig;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log(`${AppConfig.APP_NAME} v${AppConfig.APP_VERSION} initialized`);
});
