/**
 * Admin Dashboard Real-Time Charts
 * Interactive analytics with Chart.js
 */

let salesTrendChartInstance = null;
let orderStatusChartInstance = null;
let topProductsChartInstance = null;
let revenueCategoryChartInstance = null;

// Chart color schemes
const chartColors = {
    primary: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#EF4444'],
    backgrounds: ['rgba(59, 130, 246, 0.2)', 'rgba(16, 185, 129, 0.2)', 'rgba(245, 158, 11, 0.2)', 'rgba(139, 92, 247, 0.2)', 'rgba(236, 72, 153, 0.2)', 'rgba(20, 184, 166, 0.2)', 'rgba(249, 115, 22, 0.2)', 'rgba(239, 68, 68, 0.2)'],
    borders: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#EF4444']
};

/**
 * Initialize all charts
 */
async function initializeCharts() {
    console.log('Initializing dashboard charts...');
    await updateCharts();
}

/**
 * Update all charts based on selected filter
 */
async function updateCharts() {
    const filterDays = document.getElementById('chartTimeFilter')?.value || '30';
    console.log(`Updating charts with filter: ${filterDays} days`);
    
    try {
        // Fetch data
        const [ordersData, printOrdersData, productsData] = await Promise.all([
            fetch('/api/orders').then(res => res.json()),
            fetch('/api/admin/print-orders').then(res => res.json()),
            fetch('/api/products').then(res => res.json())
        ]);

        const orders = ordersData.orders || ordersData || [];
        const printOrders = printOrdersData.data?.orders || printOrdersData.orders || printOrdersData || [];
        const products = productsData.products || productsData || [];

        // Filter by date range
        const filteredOrders = filterByDateRange(orders, filterDays);
        const filteredPrintOrders = filterByDateRange(printOrders, filterDays);

        // Update each chart
        updateSalesTrendChart(filteredOrders, filteredPrintOrders, filterDays);
        updateOrderStatusChart(filteredOrders, filteredPrintOrders);
        updateTopProductsChart(filteredOrders);
        updateRevenueCategoryChart(filteredOrders, filteredPrintOrders);

        console.log('✅ Charts updated successfully');
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

/**
 * Filter data by date range
 */
function filterByDateRange(data, days) {
    if (days === 'all') return data;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    return data.filter(item => {
        const itemDate = new Date(item.createdAt || item.date);
        return itemDate >= cutoffDate;
    });
}

/**
 * Update Sales Trend Chart (Line Chart)
 */
function updateSalesTrendChart(orders, printOrders, filterDays) {
    const ctx = document.getElementById('salesTrendChart');
    if (!ctx) return;

    // Prepare data by date
    const salesByDate = {};
    const allOrders = [...orders, ...printOrders];
    
    allOrders.forEach(order => {
        const date = new Date(order.createdAt || order.date).toLocaleDateString();
        const revenue = order.total || order.totalAmount || order.estimatedPrice || 0;
        salesByDate[date] = (salesByDate[date] || 0) + revenue;
    });

    // Sort dates
    const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
    const revenues = sortedDates.map(date => salesByDate[date]);

    // Destroy existing chart
    if (salesTrendChartInstance) {
        salesTrendChartInstance.destroy();
    }

    // Create new chart
    salesTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Revenue (LKR)',
                data: revenues,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#3B82F6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Revenue: LKR ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'LKR ' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update Order Status Distribution Chart (Doughnut Chart)
 */
function updateOrderStatusChart(orders, printOrders) {
    const ctx = document.getElementById('orderStatusChart');
    if (!ctx) return;

    const allOrders = [...orders, ...printOrders];
    const statusCount = {};
    
    allOrders.forEach(order => {
        const status = order.status || 'pending';
        statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const labels = Object.keys(statusCount);
    const data = Object.values(statusCount);

    // Destroy existing chart
    if (orderStatusChartInstance) {
        orderStatusChartInstance.destroy();
    }

    // Create new chart
    orderStatusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: chartColors.backgrounds.slice(0, labels.length),
                borderColor: chartColors.borders.slice(0, labels.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update Top Products Chart (Bar Chart)
 */
function updateTopProductsChart(orders) {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;

    // Calculate product sales
    const productSales = {};
    orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                const name = item.name || item.title || 'Unknown';
                const quantity = item.quantity || 1;
                productSales[name] = (productSales[name] || 0) + quantity;
            });
        }
    });

    // Get top 10 products
    const sortedProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sortedProducts.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name);
    const data = sortedProducts.map(([, quantity]) => quantity);

    // Destroy existing chart
    if (topProductsChartInstance) {
        topProductsChartInstance.destroy();
    }

    // Create new chart
    topProductsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Units Sold',
                data: data,
                backgroundColor: chartColors.backgrounds[1],
                borderColor: chartColors.borders[1],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Sold: ${context.parsed.y} units`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Update Revenue by Category Chart (Pie Chart)
 */
function updateRevenueCategoryChart(orders, printOrders) {
    const ctx = document.getElementById('revenueCategoryChart');
    if (!ctx) return;

    // Calculate revenue by category
    const categoryRevenue = {
        'Bookshop': 0,
        'Print Services': 0
    };

    orders.forEach(order => {
        categoryRevenue['Bookshop'] += order.total || order.totalAmount || 0;
    });

    printOrders.forEach(order => {
        categoryRevenue['Print Services'] += order.estimatedPrice || order.total || 0;
    });

    // Further breakdown bookshop by product categories if available
    const detailedCategories = {};
    orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                const category = item.category || 'Books';
                const revenue = (item.price || 0) * (item.quantity || 1);
                detailedCategories[category] = (detailedCategories[category] || 0) + revenue;
            });
        }
    });

    // Combine categories
    const finalCategories = { ...detailedCategories, 'Print Services': categoryRevenue['Print Services'] };
    const labels = Object.keys(finalCategories);
    const data = Object.values(finalCategories);

    // Destroy existing chart
    if (revenueCategoryChartInstance) {
        revenueCategoryChartInstance.destroy();
    }

    // Create new chart
    revenueCategoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: chartColors.backgrounds.slice(0, labels.length),
                borderColor: chartColors.borders.slice(0, labels.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: LKR ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize charts when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCharts);
} else {
    initializeCharts();
}
