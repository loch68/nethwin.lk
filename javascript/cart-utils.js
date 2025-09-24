// Cart Utility Functions - Shared across all pages
class CartManager {
    constructor() {
        this.cartKey = 'nethwin_cart';
    }

    // Get cart from localStorage
    getCart() {
        try {
            return JSON.parse(localStorage.getItem(this.cartKey) || '[]');
        } catch (e) {
            console.warn('Error parsing cart data:', e);
            return [];
        }
    }

    // Calculate total items in cart
    getTotalItems() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
    }

    // Calculate total price in cart
    getTotalPrice() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => {
            const quantity = item.qty || item.quantity || 1;
            const price = parseFloat(item.price || 0);
            return sum + (quantity * price);
        }, 0);
    }

    // Update cart display across all navbar instances
    updateCartDisplay() {
        const totalItems = this.getTotalItems();
        const totalPrice = this.getTotalPrice();
        
        // Update desktop cart count
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            if (totalItems > 0) {
                // Show only item count
                cartCount.textContent = totalItems;
                cartCount.classList.remove('hidden');
            } else {
                cartCount.classList.add('hidden');
            }
        }

        // Update mobile cart count
        const mobileCartCount = document.getElementById('mobileCartCount');
        if (mobileCartCount) {
            if (totalItems > 0) {
                // Show only item count
                mobileCartCount.textContent = totalItems;
                mobileCartCount.classList.remove('hidden');
            } else {
                mobileCartCount.classList.add('hidden');
            }
        }

        // Hide separate cart total since it's now integrated
        const cartTotal = document.getElementById('cartTotal');
        if (cartTotal) {
            cartTotal.classList.add('hidden');
        }

        // Hide mobile cart total since it's now integrated
        const mobileCartTotal = document.getElementById('mobileCartTotal');
        if (mobileCartTotal) {
            mobileCartTotal.classList.add('hidden');
        }

        // Add animation effect
        this.animateCartUpdate();
    }

    // Animate cart update
    animateCartUpdate() {
        const cartCount = document.getElementById('cartCount');
        const mobileCartCount = document.getElementById('mobileCartCount');
        
        if (cartCount) {
            cartCount.classList.add('cart-updated');
            setTimeout(() => {
                cartCount.classList.remove('cart-updated');
            }, 600);
        }
        
        if (mobileCartCount) {
            mobileCartCount.classList.add('cart-updated');
            setTimeout(() => {
                mobileCartCount.classList.remove('cart-updated');
            }, 600);
        }
    }

    // Add item to cart
    addToCart(product) {
        const cart = this.getCart();
        const existingItemIndex = cart.findIndex(item => item.id === product.id);
        
        if (existingItemIndex !== -1) {
            cart[existingItemIndex].qty = (cart[existingItemIndex].qty || 1) + (product.qty || 1);
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                qty: product.qty || 1
            });
        }
        
        localStorage.setItem(this.cartKey, JSON.stringify(cart));
        this.updateCartDisplay();
    }

    // Remove item from cart
    removeFromCart(productId) {
        const cart = this.getCart();
        const filteredCart = cart.filter(item => item.id !== productId);
        localStorage.setItem(this.cartKey, JSON.stringify(filteredCart));
        this.updateCartDisplay();
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        const cart = this.getCart();
        const itemIndex = cart.findIndex(item => item.id === productId);
        
        if (itemIndex !== -1) {
            if (quantity <= 0) {
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].qty = quantity;
            }
            localStorage.setItem(this.cartKey, JSON.stringify(cart));
            this.updateCartDisplay();
        }
    }

    // Clear cart
    clearCart() {
        localStorage.removeItem(this.cartKey);
        this.updateCartDisplay();
    }
}

// Initialize global cart manager
window.cartManager = new CartManager();

// Legacy function for backward compatibility
function updateCartCount() {
    window.cartManager.updateCartDisplay();
}

// Initialize cart display on page load
document.addEventListener('DOMContentLoaded', function() {
    window.cartManager.updateCartDisplay();
});
