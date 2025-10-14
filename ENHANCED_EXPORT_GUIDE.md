# Enhanced Export System with Visual Charts

## Overview

The enhanced export system allows admins to download reports in **PDF**, **Excel**, and **CSV** formats with embedded **visual data representations** including bar charts, pie charts, line graphs, and doughnut charts.

## Features

✅ **PDF Reports** - Embedded chart images alongside tables  
✅ **Excel Reports** - Chart images in dedicated sheets with styled data tables  
✅ **CSV Reports** - Companion PDF/Excel with visuals in ZIP archive  
✅ **Multiple Chart Types** - Pie, Bar, Line, Doughnut charts  
✅ **Server-Side Rendering** - Consistent, high-quality chart generation  
✅ **Flexible API** - Query parameters for format, chart types, and options  

---

## Architecture

### Backend Components

```
backend/
├── src/
│   ├── charts/
│   │   ├── chartRenderer.js          # Chart.js rendering engine
│   │   └── chartDataAggregator.js    # Data transformation utilities
│   └── exporters/
│       ├── pdfExporter.js            # PDFKit-based PDF generation
│       ├── excelExporter.js          # ExcelJS-based Excel generation
│       └── csvExporter.js            # CSV with companion file support
└── server.js                         # Enhanced export endpoints
```

### Frontend Components

```
javascript/
└── enhancedExport.js                 # Export modal and API integration
```

---

## Installation

### Dependencies

Already installed via:
```bash
npm install chartjs-node-canvas archiver exceljs pdfkit
```

**Packages:**
- `chartjs-node-canvas` - Server-side Chart.js rendering
- `archiver` - ZIP file creation for CSV companions
- `exceljs` - Excel workbook generation with images
- `pdfkit` - Programmatic PDF creation

---

## API Endpoints

### 1. Enhanced Product Catalog Export

**Endpoint:** `GET /api/products/export/catalog/enhanced`

**Query Parameters:**
- `format` - `pdf`, `excel`, or `csv` (default: `pdf`)
- `includeCharts` - `true` or `false` (default: `true`)
- `chartTypes` - Comma-separated: `pie,bar,line,doughnut` (default: `pie,bar`)

**Example:**
```bash
# PDF with pie and bar charts
GET /api/products/export/catalog/enhanced?format=pdf&includeCharts=true&chartTypes=pie,bar

# Excel with all chart types
GET /api/products/export/catalog/enhanced?format=excel&includeCharts=true&chartTypes=pie,bar,line

# CSV with companion PDF
GET /api/products/export/catalog/enhanced?format=csv&includeCharts=true&chartTypes=pie,bar
```

**Charts Generated:**
- **Pie Chart** - Product distribution by category
- **Bar Chart** - Total stock by category
- **Bar Chart** - Price range distribution

---

### 2. Enhanced User Export

**Endpoint:** `GET /api/users/export/enhanced`

**Query Parameters:** Same as above

**Example:**
```bash
GET /api/users/export/enhanced?format=pdf&includeCharts=true&chartTypes=pie,line,doughnut
```

**Charts Generated:**
- **Pie Chart** - User distribution by role
- **Doughnut Chart** - User status distribution
- **Line Chart** - User growth over time (12 months)

---

### 3. Enhanced Print Orders Export

**Endpoint:** `GET /api/admin/print-orders/export/enhanced`

**Query Parameters:** Same as above

**Example:**
```bash
GET /api/admin/print-orders/export/enhanced?format=excel&includeCharts=true&chartTypes=pie,bar
```

**Charts Generated:**
- **Pie Chart** - Print job type distribution
- **Doughnut Chart** - Print job status distribution
- **Bar Chart** - Revenue by job type

---

## Frontend Integration

### Method 1: Using the Export Modal (Recommended)

Include the JavaScript module:

```html
<script src="/javascript/enhancedExport.js"></script>
```

Add export buttons to your HTML:

```html
<!-- Products Export -->
<button onclick="exportProductsEnhanced()" class="btn btn-primary">
  📊 Export with Charts
</button>

<!-- Users Export -->
<button onclick="exportUsersEnhanced()" class="btn btn-primary">
  📊 Export with Charts
</button>

<!-- Print Orders Export -->
<button onclick="exportPrintOrdersEnhanced()" class="btn btn-primary">
  📊 Export with Charts
</button>
```

The modal provides:
- Format selection (PDF/Excel/CSV)
- Chart inclusion toggle
- Chart type selection (Pie/Bar/Line/Doughnut)
- Progress indicators
- Error handling

---

### Method 2: Direct API Calls

```javascript
async function downloadEnhancedReport() {
  const url = 'http://localhost:3000/api/products/export/catalog/enhanced?format=pdf&includeCharts=true&chartTypes=pie,bar';
  
  const response = await fetch(url);
  const blob = await response.blob();
  
  // Download file
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'report.pdf';
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
}
```

---

## Chart Customization

### Adding New Chart Types

Edit `backend/src/charts/chartDataAggregator.js`:

```javascript
function aggregateProductData(products) {
  // Add new aggregation
  const topSellingProducts = products
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 10);

  return {
    // ... existing aggregations
    topSelling: {
      labels: topSellingProducts.map(p => p.name),
      data: topSellingProducts.map(p => p.soldCount)
    }
  };
}
```

Then add to chart specs generation:

```javascript
if (requestedTypes.includes('bar') && aggregated.topSelling) {
  chartSpecs.push({
    type: 'bar',
    title: 'Top 10 Best Selling Products',
    labels: aggregated.topSelling.labels,
    datasets: [{ label: 'Units Sold', data: aggregated.topSelling.data }]
  });
}
```

---

### Customizing Chart Appearance

Edit `backend/src/charts/chartRenderer.js`:

```javascript
// Change dimensions
const CHART_WIDTH = 1400;  // Default: 1200
const CHART_HEIGHT = 700;  // Default: 600

// Change color palette
const COLOR_PALETTES = {
  primary: ['#your-colors-here'],
  custom: ['#ff6384', '#36a2eb', '#ffce56']
};
```

---

## File Output Examples

### PDF Output Structure
```
Page 1: Title, metadata, logo
Page 2: Data table (first 50 rows)
Page 3+: Visual Analytics
  - Chart 1: Title + Image
  - Chart 2: Title + Image
  - Chart 3: Title + Image
Footer: Page numbers, branding
```

### Excel Output Structure
```
Sheet 1 (Data): Styled table with frozen headers
Sheet 2 (Summary): Report metadata
Sheet 3 (Charts): Chart images with titles
```

### CSV Output (with charts)
```
report_2025-01-14.zip
  ├── report_2025-01-14.csv          (Raw data)
  └── report_2025-01-14_charts.pdf   (Visual companion)
```

---

## Performance Considerations

### Chart Rendering Time
- **1 chart:** ~200-500ms
- **3 charts:** ~600-1200ms
- **5 charts:** ~1-2 seconds

### Optimization Tips

1. **Limit data points** - Aggregate large datasets before charting
2. **Parallel rendering** - Already implemented via `renderMultipleCharts()`
3. **Caching** - Consider caching chart images for identical queries
4. **Pagination** - Limit table rows in PDFs (currently 50 rows)

---

## Troubleshooting

### Issue: Charts not rendering

**Solution:**
```bash
# Verify chartjs-node-canvas installation
cd backend
npm list chartjs-node-canvas

# Reinstall if needed
npm install chartjs-node-canvas --save
```

### Issue: PDF generation fails

**Solution:**
- Check if logo file exists at `/Users/lochgraphy/Desktop/NethwinLK/assets/images/fLogo.png`
- Verify PDFKit installation: `npm list pdfkit`

### Issue: Excel images not displaying

**Solution:**
- Ensure ExcelJS version is compatible: `npm list exceljs`
- Check buffer format is PNG (not SVG)

### Issue: CSV companion not zipping

**Solution:**
- Verify archiver installation: `npm list archiver`
- Check write permissions in temp directory

---

## Testing

### Manual Testing

```bash
# Start server
cd backend
npm start

# Test endpoints
curl "http://localhost:3000/api/products/export/catalog/enhanced?format=pdf&includeCharts=true" -o test.pdf

curl "http://localhost:3000/api/users/export/enhanced?format=excel&includeCharts=true" -o test.xlsx

curl "http://localhost:3000/api/admin/print-orders/export/enhanced?format=csv&includeCharts=true" -o test.zip
```

### Automated Testing

Create `backend/test/export.test.js`:

```javascript
const request = require('supertest');
const app = require('../server');

describe('Enhanced Export Endpoints', () => {
  it('should generate PDF with charts', async () => {
    const response = await request(app)
      .get('/api/products/export/catalog/enhanced')
      .query({ format: 'pdf', includeCharts: 'true' });
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
  });
});
```

---

## Migration from Old Export System

### Old Endpoints (Still Available)
- `/api/products/export/catalog/excel` - Basic Excel
- `/api/products/export/catalog/pdf` - Basic PDF (HTML)
- `/api/users/export/csv` - Basic CSV
- `/api/users/export/pdf` - Basic PDF (HTML)

### New Enhanced Endpoints
- `/api/products/export/catalog/enhanced` - With charts
- `/api/users/export/enhanced` - With charts
- `/api/admin/print-orders/export/enhanced` - With charts

**Migration Steps:**

1. Update frontend buttons to use new endpoints
2. Include `enhancedExport.js` script
3. Replace onclick handlers:
   ```html
   <!-- Old -->
   <button onclick="window.location='/api/products/export/catalog/pdf'">Export PDF</button>
   
   <!-- New -->
   <button onclick="exportProductsEnhanced()">Export with Charts</button>
   ```

---

## Advanced Usage

### Custom Endpoint Example

```javascript
// Add to server.js
app.get('/api/custom/sales-report/enhanced', async (req, res) => {
  try {
    const { format, includeCharts, chartTypes } = req.query;
    
    // Custom data query
    const salesData = await Sale.aggregate([
      { $group: { _id: '$region', total: { $sum: '$amount' } } }
    ]);

    const tableData = salesData.map(s => ({
      'Region': s._id,
      'Total Sales': s.total
    }));

    let charts = [];
    if (includeCharts === 'true') {
      charts = await renderMultipleCharts([{
        type: 'bar',
        title: 'Sales by Region',
        labels: salesData.map(s => s._id),
        datasets: [{ label: 'Sales', data: salesData.map(s => s.total) }]
      }]);
    }

    const pdfBuffer = await createPdfWithCharts({
      title: 'Regional Sales Report',
      tableData,
      charts,
      metadata: { date: new Date().toLocaleString() }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Security Considerations

1. **Authentication** - Add auth middleware to export endpoints
2. **Rate Limiting** - Already implemented via express-rate-limit
3. **Input Validation** - Validate format and chartTypes parameters
4. **File Size Limits** - Consider limiting data rows for large exports
5. **Access Control** - Verify user permissions before export

Example auth middleware:

```javascript
app.get('/api/products/export/catalog/enhanced', 
  authenticateToken,  // JWT verification
  authorizeRole(['admin', 'manager']),  // Role check
  async (req, res) => {
    // ... export logic
  }
);
```

---

## Future Enhancements

- [ ] Native Excel charts (via Python XlsxWriter microservice)
- [ ] Real-time progress updates via WebSocket
- [ ] Scheduled exports with email delivery
- [ ] Custom chart color themes
- [ ] Interactive chart tooltips in PDF (if possible)
- [ ] Export templates system
- [ ] Batch export multiple reports as ZIP

---

## Support

For issues or questions:
1. Check console logs in browser and server
2. Verify all dependencies are installed
3. Review this documentation
4. Check existing export endpoints for reference

---

## Summary

The enhanced export system is now fully operational with:

✅ **3 new endpoints** with chart support  
✅ **4 chart types** (pie, bar, line, doughnut)  
✅ **3 export formats** (PDF, Excel, CSV+companion)  
✅ **Frontend modal** for easy user interaction  
✅ **Modular architecture** for easy extension  

**Quick Start:**
1. Include `enhancedExport.js` in your HTML
2. Add button: `<button onclick="exportProductsEnhanced()">Export</button>`
3. Users select format and chart options
4. Download report with embedded visuals

**API Quick Reference:**
```
GET /api/products/export/catalog/enhanced?format=pdf&includeCharts=true&chartTypes=pie,bar
GET /api/users/export/enhanced?format=excel&includeCharts=true&chartTypes=pie,line
GET /api/admin/print-orders/export/enhanced?format=csv&includeCharts=true&chartTypes=pie,bar
```
