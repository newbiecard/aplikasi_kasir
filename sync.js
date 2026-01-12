// ============================================
// ZETA POS ULTRA - BACKGROUND SYNC
// Handles offline data synchronization
// ============================================

class BackgroundSync {
    constructor() {
        this.syncInterval = null;
        this.isSyncing = false;
        this.syncQueue = JSON.parse(localStorage.getItem('zeta_sync_queue') || '[]');
    }
    
    start() {
        console.log('🔄 Background sync started');
        
        // Sync every 30 seconds
        this.syncInterval = setInterval(() => {
            this.syncPendingTransactions();
        }, 30000);
        
        // Initial sync
        setTimeout(() => this.syncPendingTransactions(), 5000);
    }
    
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('⏹️ Background sync stopped');
    }
    
    async syncPendingTransactions() {
        if (this.isSyncing || this.syncQueue.length === 0) return;
        
        this.isSyncing = true;
        console.log(`📤 Syncing ${this.syncQueue.length} pending transactions...`);
        
        const scriptUrl = localStorage.getItem('zeta_script_url');
        if (!scriptUrl) {
            console.log('❌ No script URL configured');
            this.isSyncing = false;
            return;
        }
        
        const successfulSyncs = [];
        
        for (let i = 0; i < this.syncQueue.length; i++) {
            const transaction = this.syncQueue[i];
            
            try {
                // Try to send to Google Sheets
                const success = await this.sendTransaction(transaction, scriptUrl);
                
                if (success) {
                    successfulSyncs.push(i);
                    console.log(`✅ Synced transaction: ${transaction.transaction_id}`);
                    
                    // Update transaction history
                    this.updateTransactionHistory(transaction.transaction_id, 'synced');
                } else {
                    // Increment retry count
                    transaction.retry_count = (transaction.retry_count || 0) + 1;
                    
                    // Remove if too many retries
                    if (transaction.retry_count >= 5) {
                        successfulSyncs.push(i);
                        console.log(`🗑️ Removing transaction after max retries: ${transaction.transaction_id}`);
                        this.updateTransactionHistory(transaction.transaction_id, 'failed');
                    }
                }
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Sync error for transaction ${transaction.transaction_id}:`, error);
            }
        }
        
        // Remove successfully synced transactions
        if (successfulSyncs.length > 0) {
            // Remove in reverse order to maintain indices
            successfulSyncs.sort((a, b) => b - a).forEach(index => {
                this.syncQueue.splice(index, 1);
            });
            
            // Save updated queue
            localStorage.setItem('zeta_sync_queue', JSON.stringify(this.syncQueue));
            
            // Update UI if available
            this.updateSyncStatusUI(this.syncQueue.length);
        }
        
        this.isSyncing = false;
        console.log(`🔄 Sync completed. ${this.syncQueue.length} transactions remaining.`);
    }
    
    async sendTransaction(transaction, scriptUrl) {
        try {
            // Remove error and retry count before sending
            const { error, retry_count, ...cleanTransaction } = transaction;
            
            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(cleanTransaction),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result.status === 'success';
            
        } catch (error) {
            console.error('Send transaction error:', error);
            return false;
        }
    }
    
    updateTransactionHistory(transactionId, status) {
        try {
            const history = JSON.parse(localStorage.getItem('zeta_transaction_history') || '[]');
            const transaction = history.find(t => t.transaction_id === transactionId);
            
            if (transaction) {
                transaction.sync_status = status;
                transaction.synced_at = new Date().toISOString();
                localStorage.setItem('zeta_transaction_history', JSON.stringify(history));
            }
        } catch (error) {
            console.error('Error updating transaction history:', error);
        }
    }
    
    updateSyncStatusUI(pendingCount) {
        // Update sync status in footer if available
        const syncStatusElement = document.getElementById('syncStatus');
        const lastSyncElement = document.getElementById('lastSync');
        
        if (syncStatusElement) {
            syncStatusElement.textContent = `Sinkronisasi: ${pendingCount > 0 ? 'Pending' : 'Up to date'}`;
        }
        
        if (lastSyncElement) {
            lastSyncElement.textContent = new Date().toLocaleTimeString('id-ID');
        }
        
        // Show notification if there are pending syncs
        if (pendingCount > 0) {
            this.showSyncNotification(pendingCount);
        }
    }
    
    showSyncNotification(pendingCount) {
        const notification = document.createElement('div');
        notification.className = 'notification info';
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-sync-alt"></i>
            </div>
            <div class="notification-content">
                <div class="notification-message">
                    ${pendingCount} transaksi pending sinkronisasi
                </div>
            </div>
        `;
        
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.appendChild(notification);
            
            // Auto-remove after 3 seconds
            setTimeout(() => notification.remove(), 3000);
        }
    }
    
    addToQueue(transaction) {
        this.syncQueue.push(transaction);
        localStorage.setItem('zeta_sync_queue', JSON.stringify(this.syncQueue));
        console.log(`📝 Added to sync queue: ${transaction.transaction_id}`);
        
        // Try immediate sync
        this.syncPendingTransactions();
    }
    
    getQueueStats() {
        return {
            pending: this.syncQueue.length,
            last_sync: localStorage.getItem('zeta_last_sync') || null
        };
    }
}

// Initialize background sync when page loads
document.addEventListener('DOMContentLoaded', () => {
    const backgroundSync = new BackgroundSync();
    
    // Start sync if there are pending transactions
    const syncQueue = JSON.parse(localStorage.getItem('zeta_sync_queue') || '[]');
    if (syncQueue.length > 0) {
        backgroundSync.start();
    }
    
    // Make available globally
    window.backgroundSync = backgroundSync;
});
