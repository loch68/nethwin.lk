/**
 * Chart Data Aggregator
 * Transforms report data into chart-ready format
 */

/**
 * Aggregate product data for charts
 */
function aggregateProductData(products) {
  // Category distribution (Pie Chart)
  const categoryCount = {};
  products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  // Stock levels by category (Bar Chart)
  const categoryStock = {};
  products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    categoryStock[cat] = (categoryStock[cat] || 0) + (p.stock || 0);
  });

  // Price distribution (Bar Chart)
  const priceRanges = {
    '0-500': 0,
    '501-1000': 0,
    '1001-2000': 0,
    '2001-5000': 0,
    '5000+': 0
  };
  products.forEach(p => {
    const price = p.sellingPrice || 0;
    if (price <= 500) priceRanges['0-500']++;
    else if (price <= 1000) priceRanges['501-1000']++;
    else if (price <= 2000) priceRanges['1001-2000']++;
    else if (price <= 5000) priceRanges['2001-5000']++;
    else priceRanges['5000+']++;
  });

  // Top 10 products by stock (Horizontal Bar)
  const topStock = products
    .sort((a, b) => (b.stock || 0) - (a.stock || 0))
    .slice(0, 10)
    .map(p => ({ name: p.name, stock: p.stock || 0 }));

  return {
    categoryDistribution: {
      labels: Object.keys(categoryCount),
      data: Object.values(categoryCount)
    },
    categoryStock: {
      labels: Object.keys(categoryStock),
      data: Object.values(categoryStock)
    },
    priceDistribution: {
      labels: Object.keys(priceRanges),
      data: Object.values(priceRanges)
    },
    topStock: {
      labels: topStock.map(p => p.name.substring(0, 30)),
      data: topStock.map(p => p.stock)
    }
  };
}

/**
 * Aggregate user data for charts
 */
function aggregateUserData(users) {
  // Role distribution (Pie Chart)
  const roleCount = {};
  users.forEach(u => {
    const role = u.role || 'customer';
    roleCount[role] = (roleCount[role] || 0) + 1;
  });

  // Status distribution (Doughnut Chart)
  const statusCount = {};
  users.forEach(u => {
    const status = u.status || 'active';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  // Customer type distribution (Bar Chart)
  const customerTypeCount = {};
  users.forEach(u => {
    if (u.customerType) {
      customerTypeCount[u.customerType] = (customerTypeCount[u.customerType] || 0) + 1;
    }
  });

  // User growth over time (Line Chart) - last 12 months
  const monthlyGrowth = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthlyGrowth[key] = 0;
  }
  users.forEach(u => {
    if (u.createdAt) {
      const date = new Date(u.createdAt);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyGrowth[key] !== undefined) {
        monthlyGrowth[key]++;
      }
    }
  });

  return {
    roleDistribution: {
      labels: Object.keys(roleCount),
      data: Object.values(roleCount)
    },
    statusDistribution: {
      labels: Object.keys(statusCount),
      data: Object.values(statusCount)
    },
    customerTypeDistribution: {
      labels: Object.keys(customerTypeCount),
      data: Object.values(customerTypeCount)
    },
    userGrowth: {
      labels: Object.keys(monthlyGrowth),
      data: Object.values(monthlyGrowth)
    }
  };
}

/**
 * Aggregate order data for charts
 */
function aggregateOrderData(orders) {
  // Order status distribution (Pie Chart)
  const statusCount = {};
  orders.forEach(o => {
    const status = o.status || 'pending';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  // Revenue by status (Bar Chart)
  const revenueByStatus = {};
  orders.forEach(o => {
    const status = o.status || 'pending';
    const total = o.totalAmount || 0;
    revenueByStatus[status] = (revenueByStatus[status] || 0) + total;
  });

  // Orders over time (Line Chart) - last 12 months
  const monthlyOrders = {};
  const monthlyRevenue = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthlyOrders[key] = 0;
    monthlyRevenue[key] = 0;
  }
  orders.forEach(o => {
    if (o.createdAt) {
      const date = new Date(o.createdAt);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyOrders[key] !== undefined) {
        monthlyOrders[key]++;
        monthlyRevenue[key] += o.totalAmount || 0;
      }
    }
  });

  // Payment method distribution (Doughnut Chart)
  const paymentMethodCount = {};
  orders.forEach(o => {
    if (o.paymentMethod) {
      paymentMethodCount[o.paymentMethod] = (paymentMethodCount[o.paymentMethod] || 0) + 1;
    }
  });

  return {
    statusDistribution: {
      labels: Object.keys(statusCount),
      data: Object.values(statusCount)
    },
    revenueByStatus: {
      labels: Object.keys(revenueByStatus),
      data: Object.values(revenueByStatus)
    },
    ordersTrend: {
      labels: Object.keys(monthlyOrders),
      data: Object.values(monthlyOrders)
    },
    revenueTrend: {
      labels: Object.keys(monthlyRevenue),
      data: Object.values(monthlyRevenue)
    },
    paymentMethodDistribution: {
      labels: Object.keys(paymentMethodCount),
      data: Object.values(paymentMethodCount)
    }
  };
}

/**
 * Aggregate print order data for charts
 */
function aggregatePrintOrderData(printOrders) {
  // Job type distribution (Pie Chart)
  const jobTypeCount = {};
  printOrders.forEach(po => {
    const type = po.jobType || 'Unknown';
    jobTypeCount[type] = (jobTypeCount[type] || 0) + 1;
  });

  // Status distribution (Doughnut Chart)
  const statusCount = {};
  printOrders.forEach(po => {
    const status = po.status || 'pending';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  // Revenue by job type (Bar Chart)
  const revenueByType = {};
  printOrders.forEach(po => {
    const type = po.jobType || 'Unknown';
    const total = po.totalCost || 0;
    revenueByType[type] = (revenueByType[type] || 0) + total;
  });

  // Print orders over time (Line Chart)
  const monthlyPrintOrders = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthlyPrintOrders[key] = 0;
  }
  printOrders.forEach(po => {
    if (po.createdAt) {
      const date = new Date(po.createdAt);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyPrintOrders[key] !== undefined) {
        monthlyPrintOrders[key]++;
      }
    }
  });

  return {
    jobTypeDistribution: {
      labels: Object.keys(jobTypeCount),
      data: Object.values(jobTypeCount)
    },
    statusDistribution: {
      labels: Object.keys(statusCount),
      data: Object.values(statusCount)
    },
    revenueByType: {
      labels: Object.keys(revenueByType),
      data: Object.values(revenueByType)
    },
    printOrdersTrend: {
      labels: Object.keys(monthlyPrintOrders),
      data: Object.values(monthlyPrintOrders)
    }
  };
}

/**
 * Generate chart specifications from aggregated data
 */
function generateChartSpecs(aggregatedData, reportType) {
  const specs = [];

  switch (reportType) {
    case 'products':
      if (aggregatedData.categoryDistribution) {
        specs.push({
          type: 'pie',
          title: 'Product Distribution by Category',
          labels: aggregatedData.categoryDistribution.labels,
          datasets: [{ label: 'Products', data: aggregatedData.categoryDistribution.data }]
        });
      }
      if (aggregatedData.categoryStock) {
        specs.push({
          type: 'bar',
          title: 'Total Stock by Category',
          labels: aggregatedData.categoryStock.labels,
          datasets: [{ label: 'Stock Units', data: aggregatedData.categoryStock.data }]
        });
      }
      if (aggregatedData.priceDistribution) {
        specs.push({
          type: 'bar',
          title: 'Price Range Distribution',
          labels: aggregatedData.priceDistribution.labels,
          datasets: [{ label: 'Number of Products', data: aggregatedData.priceDistribution.data }]
        });
      }
      break;

    case 'users':
      if (aggregatedData.roleDistribution) {
        specs.push({
          type: 'pie',
          title: 'User Distribution by Role',
          labels: aggregatedData.roleDistribution.labels,
          datasets: [{ label: 'Users', data: aggregatedData.roleDistribution.data }]
        });
      }
      if (aggregatedData.statusDistribution) {
        specs.push({
          type: 'doughnut',
          title: 'User Status Distribution',
          labels: aggregatedData.statusDistribution.labels,
          datasets: [{ label: 'Users', data: aggregatedData.statusDistribution.data }]
        });
      }
      if (aggregatedData.userGrowth) {
        specs.push({
          type: 'line',
          title: 'User Growth Over Time',
          labels: aggregatedData.userGrowth.labels,
          datasets: [{ label: 'New Users', data: aggregatedData.userGrowth.data, fill: true }]
        });
      }
      break;

    case 'orders':
      if (aggregatedData.statusDistribution) {
        specs.push({
          type: 'pie',
          title: 'Order Status Distribution',
          labels: aggregatedData.statusDistribution.labels,
          datasets: [{ label: 'Orders', data: aggregatedData.statusDistribution.data }]
        });
      }
      if (aggregatedData.revenueByStatus) {
        specs.push({
          type: 'bar',
          title: 'Revenue by Order Status',
          labels: aggregatedData.revenueByStatus.labels,
          datasets: [{ label: 'Revenue (LKR)', data: aggregatedData.revenueByStatus.data }]
        });
      }
      if (aggregatedData.ordersTrend) {
        specs.push({
          type: 'line',
          title: 'Orders Trend Over Time',
          labels: aggregatedData.ordersTrend.labels,
          datasets: [{ label: 'Orders', data: aggregatedData.ordersTrend.data }]
        });
      }
      if (aggregatedData.revenueTrend) {
        specs.push({
          type: 'line',
          title: 'Revenue Trend Over Time',
          labels: aggregatedData.revenueTrend.labels,
          datasets: [{ label: 'Revenue (LKR)', data: aggregatedData.revenueTrend.data, fill: true }]
        });
      }
      break;

    case 'printOrders':
      if (aggregatedData.jobTypeDistribution) {
        specs.push({
          type: 'pie',
          title: 'Print Job Type Distribution',
          labels: aggregatedData.jobTypeDistribution.labels,
          datasets: [{ label: 'Jobs', data: aggregatedData.jobTypeDistribution.data }]
        });
      }
      if (aggregatedData.statusDistribution) {
        specs.push({
          type: 'doughnut',
          title: 'Print Job Status Distribution',
          labels: aggregatedData.statusDistribution.labels,
          datasets: [{ label: 'Jobs', data: aggregatedData.statusDistribution.data }]
        });
      }
      if (aggregatedData.revenueByType) {
        specs.push({
          type: 'bar',
          title: 'Revenue by Job Type',
          labels: aggregatedData.revenueByType.labels,
          datasets: [{ label: 'Revenue (LKR)', data: aggregatedData.revenueByType.data }]
        });
      }
      break;
  }

  return specs;
}

module.exports = {
  aggregateProductData,
  aggregateUserData,
  aggregateOrderData,
  aggregatePrintOrderData,
  generateChartSpecs
};
