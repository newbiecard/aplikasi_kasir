// Cart-specific enhancements for Nasi Daun Jeruk POS v3

const cartEnhancements = {
    // Calculate savings breakdown
    calculateSavingsBreakdown: (cartItems) => {
        let breakdown = {
            regularSavings: 0,
            packageSavings: 0,
            bundleSavings: 0,
            totalSavings: 0
        };
        
        // Calculate individual item prices
        let regularPrice = 0;
        cartItems.forEach(item => {
            if (item.type === 'regular') regularPrice += 10000;
            if (item.type === 'premium') regularPrice += 12000;
            if (item.type === 'jeruk') regularPrice += 5000 * item.quantity;
            if (item.type === 'paket') regularPrice += 13000;
        });
        
        // Calculate current total
        const currentTotal = cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
        
        // Calculate savings
        breakdown.totalSavings = regularPrice - currentTotal;
        
        // Calculate package savings (premium vs regular + topping)
        const premiumItems = cartItems.filter(item => item.type === 'premium');
        if (premiumItems.length > 0) {
            breakdown.packageSavings = (10000 + 2000) - 12000; // Regular + topping vs premium
        }
        
        // Calculate bundle savings (paket hemat)
        const paketItems = cartItems.filter(item => item.type === 'paket');
        if (paketItems.length > 0) {
            breakdown.bundleSavings = (10000 + 5000) - 13000; // Regular + jeruk vs paket
        }
        
        return breakdown;
    },
    
    // Get topping statistics
    getToppingStats: (cartItems) => {
        const stats = {
            ayam: 0,
            kulit: 0,
            both: 0,
            none: 0
        };
        
        cartItems.forEach(item => {
            if (item.topping === 'ayam') stats.ayam += item.quantity;
            if (item.topping === 'kulit') stats.kulit += item.quantity;
            if (item.type === 'premium') stats.both += item.quantity;
        });
        
        return stats;
    },
    
    // Suggest optimal package based on cart
    suggestOptimalPackage: (cartItems) => {
        const suggestions = [];
        
        // Check for regular + jeruk combinations
        const hasRegular = cartItems.some(item => item.type === 'regular');
        const hasJeruk = cartItems.some(item => item.type === 'jeruk');
        const jerukQty = cartItems.find(item => item.type === 'jeruk')?.quantity || 0;
        
        if (hasRegular && hasJeruk && jerukQty >= 1) {
            suggestions.push({
                type: 'convert_to_paket',
                message: 'Konversi ke Paket Hemat untuk menghemat Rp 2.000',
                savings: 2000,
                action: 'convert'
            });
        }
        
        // Check for multiple regular items with same topping
        const regularItems = cartItems.filter(item => item.type === 'regular');
        const ayamCount = regularItems.filter(item => item.topping === 'ayam').length;
        const kulitCount = regularItems.filter(item => item.topping === 'kulit').length;
        
        if (ayamCount >= 2) {
            suggestions.push({
                type: 'bulk_ayam',
                message: 'Pertimbangkan Paket Lengkap untuk variasi',
                savings: 0,
                action: 'suggest_premium'
            });
        }
        
        if (kulitCount >= 2) {
            suggestions.push({
                type: 'bulk_kulit',
                message: 'Pertimbangkan Paket Lengkap untuk variasi',
                savings: 0,
                action: 'suggest_premium'
            });
        }
        
        // Check for premium + jeruk (could be optimized)
        const hasPremium = cartItems.some(item => item.type === 'premium');
        if (hasPremium && hasJeruk) {
            suggestions.push({
                type: 'premium_combo',
                message: 'Paket Lengkap + Es Jeruk adalah kombinasi terbaik!',
                savings: 0,
                action: 'combo'
            });
        }
        
        return suggestions;
    },
    
    // Validate cart for business rules
    validateCartRules: (cartItems) => {
        const errors = [];
        const warnings = [];
        
        // Rule 1: Topping must be selected for regular items
        const regularWithoutTopping = cartItems.filter(item => 
            item.type === 'regular' && !item.topping
        );
        if (regularWithoutTopping.length > 0) {
            errors.push('Pilih topping untuk item regular');
        }
        
        // Rule 2: Maximum 10 of each item type per transaction
        const itemCounts = {};
        cartItems.forEach(item => {
            itemCounts[item.type] = (itemCounts[item.type] || 0) + item.quantity;
        });
        
        Object.entries(itemCounts).forEach(([type, count]) => {
            if (count > 10) {
                errors.push(`Maksimal 10 ${type} per transaksi`);
            }
        });
        
        // Rule 3: Paket hemat requires topping selection
        const paketWithoutTopping = cartItems.filter(item => 
            item.type === 'paket' && !item.topping
        );
        if (paketWithoutTopping.length > 0) {
            errors.push('Pilih topping untuk paket hemat');
        }
        
        // Warning: Large order suggestion
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 5) {
            warnings.push({
                type: 'large_order',
                message: 'Pesanan besar terdeteksi. Pertimbangkan memproses secara bertahap.',
                suggestion: 'split_order'
            });
        }
        
        // Warning: Single item order
        if (totalItems === 1) {
            warnings.push({
                type: 'single_item',
                message: 'Hanya 1 item di keranjang. Tambahkan minuman atau paket hemat?',
                suggestion: 'add_drink'
            });
        }
        
        return { isValid: errors.length === 0, errors, warnings };
    },
    
    // Optimize cart for best price
    optimizeCart: (cartItems) => {
        const optimized = [...cartItems];
        let savings = 0;
        const changes = [];
        
        // Find regular + jeruk pairs to convert to paket
        const regularItems = optimized.filter(item => item.type === 'regular');
        const jerukItem = optimized.find(item => item.type === 'jeruk');
        
        if (regularItems.length > 0 && jerukItem && jerukItem.quantity > 0) {
            // Convert one regular + one jeruk to paket
            const regular = regularItems[0];
            const jerukQty = jerukItem.quantity;
            
            if (jerukQty >= 1) {
                // Create paket item
                const paketItem = {
                    id: utils.generateId('ITEM'),
                    name: 'Paket Hemat Nasi + Es Jeruk',
                    type: 'paket',
                    price: CONFIG.PRICES.PAKET,
                    quantity: 1,
                    topping: regular.topping,
                    description: `Nasi dengan ${regular.topping === 'ayam' ? 'Ayam Suwir' : 'Kulit Crispy'} + Es Jeruk Peras`
                };
                
                // Remove one regular and one jeruk
                regular.quantity -= 1;
                if (regular.quantity === 0) {
                    optimized.splice(optimized.indexOf(regular), 1);
                }
                
                jerukItem.quantity -= 1;
                if (jerukItem.quantity === 0) {
                    optimized.splice(optimized.indexOf(jerukItem), 1);
                }
                
                // Add paket item
                optimized.push(paketItem);
                
                // Calculate savings
                const oldPrice = CONFIG.PRICES.REGULAR + CONFIG.PRICES.JERUK;
                const newPrice = CONFIG.PRICES.PAKET;
                savings += oldPrice - newPrice;
                
                changes.push(`Mengubah 1 Regular + 1 Es Jeruk menjadi Paket Hemat (Hemat Rp ${(oldPrice - newPrice).toLocaleString('id-ID')})`);
            }
        }
        
        // Remove any zero quantity items
        const finalOptimized = optimized.filter(item => item.quantity > 0);
        
        return {
            cart: finalOptimized,
            savings: savings,
            changes: changes,
            hasChanges: changes.length > 0
        };
    },
    
    // Get cart summary for display
    getCartSummaryDisplay: () => {
        const summary = cartManager.getCartSummary();
        const savings = cartEnhancements.calculateSavingsBreakdown(state.cart.items);
        const stats = cartEnhancements.getToppingStats(state.cart.items);
        const suggestions = cartEnhancements.suggestOptimalPackage(state.cart.items);
        const validation = cartEnhancements.validateCartRules(state.cart.items);
        
        return {
            items: summary.items,
            totals: summary,
            savings: savings,
            statistics: {
                totalItems: state.cart.items.reduce((sum, item) => sum + item.quantity, 0),
                uniqueItems: state.cart.items.length,
                toppingDistribution: stats
            },
            suggestions: suggestions,
            validation: validation,
            optimization: cartEnhancements.optimizeCart(state.cart.items)
        };
    },
    
    // Add item with animation and feedback
    addItemWithFeedback: (type, options = {}) => {
        const oldCart = [...state.cart.items];
        cartManager.addItem(type, options);
        
        // Show savings feedback if applicable
        setTimeout(() => {
            const newCart = state.cart.items;
            const oldTotal = oldCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const newTotal = state.cart.finalTotal;
            
            if (newTotal < oldTotal) {
                const savings = oldTotal - newTotal;
                utils.showNotification(`Hemat Rp ${savings.toLocaleString('id-ID')} dengan pilihan ini!`, 'success', 4000);
            }
            
            // Show package suggestion if applicable
            const suggestions = cartEnhancements.suggestOptimalPackage(newCart);
            if (suggestions.length > 0 && Math.random() > 0.7) { // 30% chance to show
                const suggestion = suggestions[0];
                utils.showNotification(suggestion.message, 'info', 5000);
            }
        }, 500);
    },
    
    // Initialize cart enhancements
    init: () => {
        console.log('Cart enhancements initialized');
        
        // Add visual feedback for topping selection
        const toppingOptions = document.querySelectorAll('.topping-option input[type="radio"]');
        toppingOptions.forEach(option => {
            option.addEventListener('change', function() {
                const label = this.nextElementSibling;
                const container = label.closest('.topping-option');
                
                // Add visual feedback
                container.classList.add('selected');
                setTimeout(() => {
                    container.classList.remove('selected');
                }, 300);
                
                // Play sound
                utils.playSound('click');
            });
        });
        
        // Add quantity change animations
        document.addEventListener('click', function(e) {
            if (e.target.closest('.qty-change')) {
                const btn = e.target.closest('.qty-change');
                const itemId = btn.dataset.id;
                const item = state.cart.items.find(i => i.id === itemId);
                
                if (item) {
                    // Animate quantity display
                    const qtyDisplay = btn.parentElement.querySelector('span');
                    if (qtyDisplay) {
                        qtyDisplay.classList.add('bounce');
                        setTimeout(() => {
                            qtyDisplay.classList.remove('bounce');
                        }, 300);
                    }
                }
            }
        });
        
        // Add cart summary tooltip
        const cartSummary = document.querySelector('.total-cart');
        if (cartSummary) {
            cartSummary.addEventListener('mouseenter', function() {
                const summary = cartEnhancements.getCartSummaryDisplay();
                const tooltip = document.createElement('div');
                tooltip.className = 'cart-tooltip';
                tooltip.innerHTML = `
                    <div class="tooltip-header">
                        <strong>Ringkasan Keranjang</strong>
                    </div>
                    <div class="tooltip-body">
                        <div class="tooltip-row">
                            <span>Total Item:</span>
                            <span>${summary.statistics.totalItems}</span>
                        </div>
                        <div class="tooltip-row">
                            <span>Total Hemat:</span>
                            <span class="savings">Rp ${summary.savings.totalSavings.toLocaleString('id-ID')}</span>
                        </div>
                        ${summary.suggestions.length > 0 ? `
                        <div class="tooltip-suggestion">
                            <i class="fas fa-lightbulb"></i>
                            <span>${summary.suggestions[0].message}</span>
                        </div>
                        ` : ''}
                    </div>
                `;
                
                // Style tooltip
                tooltip.style.cssText = `
                    position: absolute;
                    top: calc(100% + 10px);
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    min-width: 250px;
                    font-size: 12px;
                `;
                
                // Position tooltip
                const rect = this.getBoundingClientRect();
                tooltip.style.right = `${window.innerWidth - rect.right}px`;
                tooltip.style.top = `${rect.bottom + 10}px`;
                
                document.body.appendChild(tooltip);
                
                // Remove tooltip on mouse leave
                cartSummary.addEventListener('mouseleave', function removeTooltip() {
                    tooltip.remove();
                    cartSummary.removeEventListener('mouseleave', removeTooltip);
                }, { once: true });
            });
        }
        
        // Add auto-optimize button (optional)
        const autoOptimizeBtn = document.createElement('button');
        autoOptimizeBtn.className = 'btn-outline btn-small';
        autoOptimizeBtn.innerHTML = '<i class="fas fa-magic"></i> Optimalkan';
        autoOptimizeBtn.style.marginLeft = '10px';
        autoOptimizeBtn.style.display = 'none';
        
        autoOptimizeBtn.addEventListener('click', () => {
            const optimization = cartEnhancements.optimizeCart(state.cart.items);
            if (optimization.hasChanges) {
                if (confirm(`Optimalkan keranjang? Akan menghemat Rp ${optimization.savings.toLocaleString('id-ID')}\n\n${optimization.changes.join('\n')}`)) {
                    state.cart.items = optimization.cart;
                    cartManager.updateCart();
                    utils.showNotification(`Keranjang dioptimalkan! Hemat Rp ${optimization.savings.toLocaleString('id-ID')}`, 'success');
                }
            } else {
                utils.showNotification('Keranjang sudah optimal', 'info');
            }
        });
        
        // Add button to clear cart button container
        const clearCartContainer = elements.clearCart.parentElement;
        if (clearCartContainer) {
            clearCartContainer.appendChild(autoOptimizeBtn);
            
            // Show/hide optimize button based on cart contents
            const observer = new MutationObserver(() => {
                const optimization = cartEnhancements.optimizeCart(state.cart.items);
                autoOptimizeBtn.style.display = optimization.hasChanges ? 'inline-flex' : 'none';
            });
            
            observer.observe(elements.orderItems, { childList: true, subtree: true });
        }
    }
};

// Initialize when app is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        cartEnhancements.init();
    }, 1000);
});

// Export for global access
window.CartEnhancements = cartEnhancements;