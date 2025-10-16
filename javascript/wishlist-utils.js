// Wishlist Utility Functions - Shared across all pages
class WishlistManager {
    constructor() {
        this.wishlistKey = 'nethwin_wishlist';
    }

    // Get wishlist from localStorage
    getWishlist() {
        try {
            return JSON.parse(localStorage.getItem(this.wishlistKey) || '[]');
        } catch (e) {
            console.warn('Error parsing wishlist data:', e);
            return [];
        }
    }

    // Calculate total items in wishlist
    getTotalItems() {
        const wishlist = this.getWishlist();
        return wishlist.length;
    }

    // Update wishlist display across all navbar instances
    updateWishlistDisplay() {
        const totalItems = this.getTotalItems();
        
        // Update desktop wishlist count
        const wishlistCount = document.getElementById('wishlistCount');
        if (wishlistCount) {
            if (totalItems > 0) {
                wishlistCount.textContent = totalItems;
                wishlistCount.classList.remove('hidden');
            } else {
                wishlistCount.classList.add('hidden');
            }
        }

        // Update mobile wishlist count
        const mobileWishlistCount = document.getElementById('mobileWishlistCount');
        if (mobileWishlistCount) {
            if (totalItems > 0) {
                mobileWishlistCount.textContent = totalItems;
                mobileWishlistCount.classList.remove('hidden');
            } else {
                mobileWishlistCount.classList.add('hidden');
            }
        }

        // Update all wishlist heart icons
        this.updateWishlistHearts();

        // Add animation effect
        this.animateWishlistUpdate();
    }

    // Update heart icons based on wishlist status
    updateWishlistHearts() {
        const wishlist = this.getWishlist();
        const wishlistIds = wishlist.map(item => item.id);

        // Update all heart icons on the page
        document.querySelectorAll('[data-wishlist-id]').forEach(heartBtn => {
            const productId = heartBtn.getAttribute('data-wishlist-id');
            const heartIcon = heartBtn.querySelector('.wishlist-heart');
            
            if (wishlistIds.includes(productId)) {
                // Item is in wishlist - show filled heart
                heartBtn.classList.add('in-wishlist');
                if (heartIcon) {
                    heartIcon.innerHTML = `
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    `;
                }
            } else {
                // Item is not in wishlist - show outline heart
                heartBtn.classList.remove('in-wishlist');
                if (heartIcon) {
                    heartIcon.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                    `;
                }
            }
        });
    }

    // Animate wishlist update
    animateWishlistUpdate() {
        const wishlistCount = document.getElementById('wishlistCount');
        const mobileWishlistCount = document.getElementById('mobileWishlistCount');
        
        if (wishlistCount) {
            wishlistCount.classList.add('wishlist-updated');
            setTimeout(() => {
                wishlistCount.classList.remove('wishlist-updated');
            }, 600);
        }
        
        if (mobileWishlistCount) {
            mobileWishlistCount.classList.add('wishlist-updated');
            setTimeout(() => {
                mobileWishlistCount.classList.remove('wishlist-updated');
            }, 600);
        }
    }

    // Check if item is in wishlist
    isInWishlist(productId) {
        const wishlist = this.getWishlist();
        return wishlist.some(item => item.id === productId);
    }

    // Add item to wishlist
    addToWishlist(product) {
        const wishlist = this.getWishlist();
        const existingItemIndex = wishlist.findIndex(item => item.id === product.id);
        
        if (existingItemIndex === -1) {
            wishlist.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                category: product.category,
                brand: product.brand,
                addedAt: new Date().toISOString()
            });
            
            localStorage.setItem(this.wishlistKey, JSON.stringify(wishlist));
            this.updateWishlistDisplay();
            
            // Track wishlist addition on server
            this.trackWishlistAction(product.id, 'add');
            
            return true; // Item added
        }
        return false; // Item already exists
    }

    // Remove item from wishlist
    removeFromWishlist(productId) {
        const wishlist = this.getWishlist();
        const filteredWishlist = wishlist.filter(item => item.id !== productId);
        localStorage.setItem(this.wishlistKey, JSON.stringify(filteredWishlist));
        this.updateWishlistDisplay();
        
        // Track wishlist removal on server
        this.trackWishlistAction(productId, 'remove');
    }

    // Toggle item in wishlist
    toggleWishlist(product) {
        if (this.isInWishlist(product.id)) {
            this.removeFromWishlist(product.id);
            return false; // Removed
        } else {
            this.addToWishlist(product);
            return true; // Added
        }
    }

    // Clear wishlist
    clearWishlist() {
        localStorage.removeItem(this.wishlistKey);
        this.updateWishlistDisplay();
    }

    // Move item from wishlist to cart
    moveToCart(productId) {
        const wishlist = this.getWishlist();
        const item = wishlist.find(item => item.id === productId);
        
        if (item && window.cartManager) {
            // Add to cart
            window.cartManager.addToCart({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                qty: 1
            });
            
            // Remove from wishlist
            this.removeFromWishlist(productId);
            return true;
        }
        return false;
    }

    // Track wishlist actions on server for analytics
    async trackWishlistAction(productId, action) {
        try {
            // Get user ID if available
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userId = userData._id || 'anonymous_' + Date.now();
            
            await fetch('/api/wishlist/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productId: productId,
                    userId: userId,
                    action: action,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.warn('Failed to track wishlist action:', error);
            // Don't throw error - tracking is optional
        }
    }

    // Send current wishlist data to server for analytics
    async syncWishlistData() {
        try {
            const wishlist = this.getWishlist();
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userId = userData._id || 'anonymous_' + Date.now();
            
            await fetch('/api/wishlist/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    wishlist: wishlist,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.warn('Failed to sync wishlist data:', error);
        }
    }
}

// Initialize global wishlist manager
window.wishlistManager = new WishlistManager();

// Legacy function for backward compatibility
function updateWishlistCount() {
    window.wishlistManager.updateWishlistDisplay();
}

// Initialize wishlist display on page load
document.addEventListener('DOMContentLoaded', function() {
    window.wishlistManager.updateWishlistDisplay();
    
    // Sync wishlist data with server on page load
    window.wishlistManager.syncWishlistData();
    
    // Sync wishlist data periodically (every 5 minutes)
    setInterval(() => {
        window.wishlistManager.syncWishlistData();
    }, 5 * 60 * 1000);
});

// Handle wishlist heart clicks
document.addEventListener('click', function(e) {
    const wishlistBtn = e.target.closest('[data-wishlist-id]');
    if (wishlistBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const productId = wishlistBtn.getAttribute('data-wishlist-id');
        const productName = wishlistBtn.getAttribute('data-product-name') || 'Product';
        const productPrice = parseFloat(wishlistBtn.getAttribute('data-product-price')) || 0;
        const productImage = wishlistBtn.getAttribute('data-product-image') || '';
        const productCategory = wishlistBtn.getAttribute('data-product-category') || '';
        const productBrand = wishlistBtn.getAttribute('data-product-brand') || '';
        
        const product = {
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            category: productCategory,
            brand: productBrand
        };
        
        const wasAdded = window.wishlistManager.toggleWishlist(product);
        
        // Add visual feedback
        const heartIcon = wishlistBtn.querySelector('.wishlist-heart');
        if (heartIcon) {
            heartIcon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                heartIcon.style.transform = 'scale(1)';
            }, 200);
        }
        
        // Show notification
        const message = wasAdded ? 
            `${productName} added to wishlist!` : 
            `${productName} removed from wishlist!`;
        
        showWishlistNotification(message, wasAdded);
    }
});

// Show wishlist notification
function showWishlistNotification(message, isAdded) {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.wishlist-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `wishlist-notification fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transform translate-x-full transition-transform duration-300 ${isAdded ? 'bg-green-500' : 'bg-red-500'}`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translateX(full)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
