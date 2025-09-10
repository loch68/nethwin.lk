// Product Page Generator Utility
// This script helps generate individual product detail pages from admin products data

// Function to generate a product detail page HTML
function generateProductPage(product) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${product.name} - NethwinLK</title>
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin="" />
    <link
      rel="stylesheet"
      as="style"
      onload="this.rel='stylesheet'"
      href="https://fonts.googleapis.com/css2?display=swap&amp;family=Inter%3Awght%40400%3B500%3B700%3B900&amp;family=Noto+Sans%3Awght%40400%3B500%3B700%3B900"
    />
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <style>
        .quantity-btn {
            transition: all 0.2s ease-in-out;
        }
        .quantity-btn:hover {
            background-color: #19e619;
            color: white;
        }
    </style>
</head>
<body>
    <div class="relative flex size-full min-h-screen flex-col bg-[#f8fbfa] group/design-root overflow-x-hidden" style='font-family: Inter, "Noto Sans", sans-serif;'>
        
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-[#e8f2ec]">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center gap-4">
                        <div class="size-8">
                            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    fill-rule="evenodd"
                                    clip-rule="evenodd"
                                    d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
                                    fill="#19e619"
                                ></path>
                            </svg>
                        </div>
                        <h1 class="text-[#0e1a13] text-xl font-bold">NethwinLK</h1>
                    </div>
                    <nav class="flex items-center gap-6">
                        <a href="index.html" class="text-[#51946c] hover:text-[#19e619] transition-colors">Home</a>
                        <a href="bookshop.html" class="text-[#51946c] hover:text-[#19e619] transition-colors">Shop</a>
                        <a href="cart.html" class="text-[#51946c] hover:text-[#19e619] transition-colors">Cart</a>
                        <a href="login.html" class="text-[#51946c] hover:text-[#19e619] transition-colors">Login</a>
                    </nav>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <!-- Breadcrumb -->
                <nav class="mb-8">
                    <ol class="flex items-center space-x-2 text-sm text-[#19e619]">
                        <li><a href="index.html" class="hover:text-[#19e619]">Home</a></li>
                        <li><span class="mx-2">/</span></li>
                        <li><a href="bookshop.html" class="hover:text-[#19e619]">Shop</a></li>
                        <li><span class="mx-2">/</span></li>
                        <li class="text-[#0e1a13] font-medium">${product.name}</li>
                    </ol>
                </nav>

                <!-- Product Details -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <!-- Product Image -->
                    <div class="space-y-4">
                        <div class="aspect-square bg-white rounded-lg border border-[#d1e6d9] overflow-hidden">
                            <img src="${product.image || 'https://via.placeholder.com/600x600?text=No+Image'}" alt="${product.name}" class="w-full h-full object-cover">
                        </div>
                        <div class="flex gap-2">
                            <button class="w-20 h-20 bg-white border border-[#d1e6d9] rounded-lg overflow-hidden hover:border-[#19e619] transition-colors">
                                <img src="${product.image || 'https://via.placeholder.com/80x80?text=No+Image'}" alt="Thumbnail 1" class="w-full h-full object-cover">
                            </button>
                            <button class="w-20 h-20 bg-white border border-[#d1e6d9] rounded-lg overflow-hidden hover:border-[#19e619] transition-colors">
                                <img src="${product.image || 'https://via.placeholder.com/80x80?text=No+Image'}" alt="Thumbnail 2" class="w-full h-full object-cover">
                            </button>
                            <button class="w-20 h-20 bg-white border border-[#d1e6d9] rounded-lg overflow-hidden hover:border-[#19e619] transition-colors">
                                <img src="${product.image || 'https://via.placeholder.com/80x80?text=No+Image'}" alt="Thumbnail 3" class="w-full h-full object-cover">
                            </button>
                        </div>
                    </div>

                    <!-- Product Info -->
                    <div class="space-y-6">
                        <div>
                            <h1 class="text-3xl font-bold text-[#0e1a13] mb-2">${product.name}</h1>
                            <p class="text-[#51946c] text-sm">SKU: ${product.sku || 'N/A'}</p>
                        </div>

                        <div class="flex items-center gap-4">
                            <span class="text-3xl font-bold text-[#19e619]">$${(product.sellingPrice || product.price || 0).toFixed(2)}</span>
                            ${product.unitPurchasePrice && product.unitPurchasePrice < product.sellingPrice ? 
                                `<span class="text-xl text-[#51946c] line-through">$${product.unitPurchasePrice.toFixed(2)}</span>
                                 <span class="bg-[#19e619] text-white px-2 py-1 rounded text-sm font-medium">-${Math.round(((product.unitPurchasePrice - product.sellingPrice) / product.unitPurchasePrice) * 100)}%</span>` : 
                                ''
                            }
                        </div>

                        <div>
                            <p class="text-[#0e1a13] leading-relaxed">
                                ${product.description || 'No description available.'}
                            </p>
                        </div>

                        <div class="space-y-4">
                            <div class="flex items-center gap-4">
                                <span class="text-[#0e1a13] font-medium">Availability:</span>
                                <span class="text-[#19e619] font-medium">${product.availability === 'in_stock' ? 'In Stock' : product.availability === 'low_stock' ? 'Low Stock' : 'Out of Stock'}</span>
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-[#0e1a13] font-medium">Brand:</span>
                                <span class="text-[#51946c]">${product.brand || 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-[#0e1a13] font-medium">Category:</span>
                                <span class="text-[#51946c]">${product.category || 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Quantity Selector -->
                        <div class="space-y-3">
                            <label class="text-[#0e1a13] font-medium">Quantity:</label>
                            <div class="flex items-center gap-3">
                                <button id="decreaseQuantity" class="quantity-btn w-10 h-10 bg-[#e8f2ec] text-[#0e1a13] rounded-lg flex items-center justify-center font-bold text-lg hover:bg-[#19e619] hover:text-white transition-colors">
                                    -
                                </button>
                                <input id="quantityInput" type="number" value="1" min="1" max="${product.currentStock || product.stock || 99}" class="w-20 h-10 text-center border border-[#d1e6d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19e619] focus:border-transparent">
                                <button id="increaseQuantity" class="quantity-btn w-10 h-10 bg-[#e8f2ec] text-[#0e1a13] rounded-lg flex items-center justify-center font-bold text-lg hover:bg-[#19e619] hover:text-white transition-colors">
                                    +
                                </button>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-4">
                            <button id="addToCartBtn" class="flex-1 bg-[#19e619] text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
                                </svg>
                                Add to Cart
                            </button>
                            <button id="buyNowBtn" class="flex-1 bg-[#0e1a13] text-white py-4 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                                Buy Now
                            </button>
                        </div>

                        <!-- Total Price -->
                        <div class="bg-[#e8f2ec] p-4 rounded-lg">
                            <div class="flex justify-between items-center">
                                <span class="text-[#0e1a13] font-medium">Total Price:</span>
                                <span id="totalPrice" class="text-2xl font-bold text-[#19e619]">$${(product.sellingPrice || product.price || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Additional Information -->
                <div class="mt-16">
                    <div class="border-b border-[#d1e6d9]">
                        <nav class="flex space-x-8">
                            <button class="tab-btn active py-4 px-1 border-b-2 border-[#19e619] text-[#19e619] font-medium" data-tab="description">
                                Description
                            </button>
                            <button class="tab-btn py-4 px-1 border-b-2 border-transparent text-[#51946c] font-medium" data-tab="specifications">
                                Specifications
                            </button>
                        </nav>
                    </div>

                    <div class="py-8">
                        <!-- Description Tab -->
                        <div id="descriptionTab" class="tab-content">
                            <h3 class="text-xl font-semibold text-[#0e1a13] mb-4">Product Description</h3>
                            <p class="text-[#0e1a13] leading-relaxed">
                                ${product.description || 'No detailed description available for this product.'}
                            </p>
                        </div>

                        <!-- Specifications Tab -->
                        <div id="specificationsTab" class="tab-content hidden">
                            <h3 class="text-xl font-semibold text-[#0e1a13] mb-4">Product Specifications</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">Product Type:</span>
                                    <span class="text-[#0e1a13] font-medium">${product.productType || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">SKU:</span>
                                    <span class="text-[#0e1a13] font-medium">${product.sku || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">Brand:</span>
                                    <span class="text-[#0e1a13] font-medium">${product.brand || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">Category:</span>
                                    <span class="text-[#0e1a13] font-medium">${product.category || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">Tax Rate:</span>
                                    <span class="text-[#0e1a13] font-medium">${product.tax || 0}%</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">Business Location:</span>
                                    <span class="text-[#0e1a13] font-medium">${product.businessLocation || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">Current Stock:</span>
                                    <span class="text-[#0e1a13] font-medium">${product.currentStock || product.stock || 0}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-[#e8f2ec]">
                                    <span class="text-[#51946c]">Unit Purchase Price:</span>
                                    <span class="text-[#0e1a13] font-medium">$${(product.unitPurchasePrice || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="bg-[#0e1a13] text-white py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <p>&copy; 2024 NethwinLK. All rights reserved.</p>
                </div>
            </div>
        </footer>
    </div>

    <script>
        // Product data for this page
        const productData = ${JSON.stringify(product, null, 2)};

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            setupEventListeners();
            setupTabs();
        });

        // Setup event listeners
        function setupEventListeners() {
            const decreaseBtn = document.getElementById('decreaseQuantity');
            const increaseBtn = document.getElementById('increaseQuantity');
            const quantityInput = document.getElementById('quantityInput');
            const addToCartBtn = document.getElementById('addToCartBtn');
            const buyNowBtn = document.getElementById('buyNowBtn');

            decreaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    updateTotalPrice();
                }
            });

            increaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                const maxStock = productData.currentStock || productData.stock || 99;
                if (currentValue < maxStock) {
                    quantityInput.value = currentValue + 1;
                    updateTotalPrice();
                }
            });

            quantityInput.addEventListener('input', updateTotalPrice);

            addToCartBtn.addEventListener('click', addToCart);
            buyNowBtn.addEventListener('click', buyNow);
        }

        // Update total price based on quantity
        function updateTotalPrice() {
            const quantity = parseInt(document.getElementById('quantityInput').value);
            const price = productData.sellingPrice || productData.price || 0;
            const total = price * quantity;
            document.getElementById('totalPrice').textContent = \`\$\${total.toFixed(2)}\`;
        }

        // Setup tab functionality
        function setupTabs() {
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');

            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.getAttribute('data-tab');
                    
                    // Update active tab button
                    tabBtns.forEach(b => {
                        b.classList.remove('active', 'border-[#19e619]', 'text-[#19e619]');
                        b.classList.add('border-transparent', 'text-[#51946c]');
                    });
                    btn.classList.add('active', 'border-[#19e619]', 'text-[#19e619]');
                    btn.classList.remove('border-transparent', 'text-[#51946c]');
                    
                    // Show target tab content
                    tabContents.forEach(content => {
                        content.classList.add('hidden');
                    });
                    document.getElementById(\`\${targetTab}Tab\`).classList.remove('hidden');
                });
            });
        }

        // Add to cart functionality
        function addToCart() {
            const quantity = parseInt(document.getElementById('quantityInput').value);
            const cartItem = {
                id: productData.id,
                name: productData.name,
                price: productData.sellingPrice || productData.price || 0,
                image: productData.image,
                quantity: quantity
            };
            
            // Get existing cart from localStorage
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            // Check if item already exists in cart
            const existingItemIndex = cart.findIndex(item => item.id === cartItem.id);
            if (existingItemIndex !== -1) {
                cart[existingItemIndex].quantity += quantity;
            } else {
                cart.push(cartItem);
            }
            
            // Save to localStorage
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Show success message
            alert('Product added to cart successfully!');
        }

        // Buy now functionality
        function buyNow() {
            const quantity = parseInt(document.getElementById('quantityInput').value);
            const price = productData.sellingPrice || productData.price || 0;
            
            // Redirect to checkout page with product data
            const checkoutData = {
                items: [{
                    id: productData.id,
                    name: productData.name,
                    price: price,
                    image: productData.image,
                    quantity: quantity
                }],
                total: price * quantity
            };
            
            localStorage.setItem('checkout', JSON.stringify(checkoutData));
            window.location.href = 'checkout.html';
        }
    </script>
</body>
</html>`;

    return html;
}

// Function to create a product page file
function createProductPage(product, filename = null) {
    if (!filename) {
        // Generate filename from product name
        filename = product.name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') + '.html';
    }
    
    const html = generateProductPage(product);
    
    // In a real environment, you would save this to a file
    // For now, we'll return the HTML content
    return {
        filename: filename,
        html: html,
        product: product
    };
}

// Example usage:
// const product = {
//     id: 1,
//     name: 'The Secret Garden',
//     description: 'A classic children\'s novel...',
//     image: 'https://example.com/image.jpg',
//     price: 12.99,
//     sku: 'BOOK-001',
//     // ... other fields
// };
// 
// const pageData = createProductPage(product);
// console.log('Generated page:', pageData.filename);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateProductPage, createProductPage };
}
