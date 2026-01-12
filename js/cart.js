// Cart-specific functionality
// This file handles additional cart operations

const cartEnhancements = {
    // Calculate topping combinations
    getToppingCombination: () => {
        const toppings = [];
        if (state.cart.toppingAyam) toppings.push('Ayam Suwir');
        if (state.cart.toppingKulit) toppings.push('Kulit Crispy');
        
        if (toppings.length === 0) return 'Tanpa topping';
        if (toppings.length === 1) return `Dengan ${toppings[0]}`;
        return 'Dengan kedua topping';
    },
    
    // Get topping price breakdown
    getToppingBreakdown: () => {
        const breakdown = [];
        
        if (state.cart.toppingAyam) {
            breakdown.push({
                name: 'Ayam Suwir',
                price: CONFIG.PRICES.TOPPING
            });
        }
        
        if (state.cart.toppingKulit) {
            breakdown.push({
                name: 'Kulit Ayam Crispy',
                price: CONFIG.PRICES.TOPPING
            });
        }
        
        return breakdown;
    },
    
    // Check if order is valid
    validateOrder: () => {
        const errors = [];
        
        // Nasi must be ordered to add toppings
        if ((state.cart.toppingAyam || state.cart.toppingKulit) && state.cart.nasi === 0) {
            errors.push('Topping hanya bisa ditambahkan dengan Nasi Daun Jeruk');
        }
        
        // Check maximum quantities
        if (state.cart.nasi > 10) {
            errors.push('Maksimal 10 porsi nasi per transaksi');
        }
        
        if (state.cart.jeruk > 10) {
            errors.push('Maksimal 10 es jeruk per transaksi');
        }
        
        if (state.cart.teh > 10) {
            errors.push('Maksimal 10 teh es per transaksi');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    // Suggest drinks based on order
    suggestDrinks: () => {
        const suggestions = [];
        
        if (state.cart.nasi > 0) {
            suggestions.push({
                drink: 'Es Jeruk Peras',
                reason: 'Sempurna dengan nasi daun jeruk',
                price: CONFIG.PRICES.JERUK
            });
        }
        
        if (state.cart.nasi >= 2) {
            suggestions.push({
                drink: 'Teh Es Manis',
                reason: 'Untuk pesanan keluarga',
                price: CONFIG.PRICES.TEH
            });
        }
        
        return suggestions;
    },
    
    // Calculate savings if ordering combo
    calculateSavings: () => {
        // Example: Buy nasi + both toppings + 2 drinks = discount
        const hasCombo = state.cart.nasi > 0 && 
                        state.cart.toppingAyam && 
                        state.cart.toppingKulit && 
                        (state.cart.jeruk + state.cart.teh) >= 2;
        
        if (hasCombo) {
            const normalPrice = cartManager.getTotal();
            const discountedPrice = normalPrice * 0.9; // 10% discount
            return {
                hasDiscount: true,
                discountPercent: 10,
                savings: normalPrice - discountedPrice,
                finalPrice: discountedPrice
            };
        }
        
        return { hasDiscount: false, savings: 0 };
    },
    
    // Get order summary for display
    getOrderSummary: () => {
        const total = cartManager.getTotal();
        const validation = cartEnhancements.validateOrder();
        const savings = cartEnhancements.calculateSavings();
        const suggestions = cartEnhancements.suggestDrinks();
        
        return {
            items: {
                nasi: state.cart.nasi,
                toppings: cartEnhancements.getToppingCombination(),
                drinks: {
                    jeruk: state.cart.jeruk,
                    teh: state.cart.teh
                }
            },
            totals: {
                subtotal: total,
                discount: savings.savings,
                final: savings.hasDiscount ? savings.finalPrice : total
            },
            validation: validation,
            suggestions: suggestions,
            savings: savings
        };
    },
    
    // Add animation to cart updates
    animateCartUpdate: (item) => {
        const cartIcon = document.querySelector('.fa-shopping-cart');
        if (cartIcon) {
            cartIcon.parentElement.classList.add('pulse');
            setTimeout(() => {
                cartIcon.parentElement.classList.remove('pulse');
            }, 1000);
        }
        
        // Show item added animation
        if (item) {
            const itemElement = document.querySelector(`[data-item="${item}"]`);
            if (itemElement) {
                itemElement.classList.add('bounce');
                setTimeout(() => {
                    itemElement.classList.remove('bounce');
                }, 1000);
            }
        }
    },
    
    // Initialize cart animations and enhancements
    init: () => {
        console.log('Cart enhancements loaded');
        
        // Add quantity update listeners for better UX
        const quantityButtons = document.querySelectorAll('.qty-btn');
        quantityButtons.forEach(button => {
            button.addEventListener('click', function() {
                const drink = this.dataset.drink;
                const isPlus = this.classList.contains('plus');
                
                if (isPlus) {
                    cartManager.addItem(drink);
                } else {
                    cartManager.removeItem(drink);
                }
                
                // Animate the quantity display
                const qtyDisplay = document.getElementById(`qty${drink.charAt(0).toUpperCase() + drink.slice(1)}`);
                if (qtyDisplay) {
                    qtyDisplay.classList.add('pulse');
                    setTimeout(() => qtyDisplay.classList.remove('pulse'), 300);
                }
            });
        });
        
        // Add topping selection animations
        const toppingCheckboxes = document.querySelectorAll('.topping-checkbox');
        toppingCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const toppingItem = this.closest('.topping-item');
                if (this.checked) {
                    toppingItem.classList.add('selected');
                    toppingItem.style.animation = 'pulse 0.5s';
                } else {
                    toppingItem.classList.remove('selected');
                }
                
                setTimeout(() => {
                    toppingItem.style.animation = '';
                }, 500);
            });
        });
        
        // Initialize tooltips for cart items
        const initTooltips = () => {
            const tooltipElements = document.querySelectorAll('[data-tooltip]');
            tooltipElements.forEach(element => {
                element.addEventListener('mouseenter', function() {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = this.dataset.tooltip;
                    document.body.appendChild(tooltip);
                    
                    const rect = this.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + rect.width / 2}px`;
                    tooltip.style.top = `${rect.top - 10}px`;
                    tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                });
                
                element.addEventListener('mouseleave', function() {
                    const tooltip = document.querySelector('.tooltip');
                    if (tooltip) tooltip.remove();
                });
            });
        };
        
        // Initialize after a short delay
        setTimeout(initTooltips, 1000);
    }
};

// Add to global App object
window.App.cartEnhancements = cartEnhancements;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', cartEnhancements.init);
