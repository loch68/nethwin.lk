/**
 * Enhanced PDF Exporter with Chart Support
 * Uses PDFKit for programmatic PDF generation with NethwinLK branding
 */

const PDFDocument = require('pdfkit');
const axios = require('axios');

// NethwinLK Logo from Cloudinary
const NETHWIN_LOGO_URL = 'https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png';

/**
 * Download logo from Cloudinary
 */
async function downloadLogo() {
  try {
    const response = await axios.get(NETHWIN_LOGO_URL, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    console.warn('Could not download NethwinLK logo:', error.message);
    return null;
  }
}

/**
 * Create a PDF with tables and charts
 * @param {Object} params
 * @param {string} params.title - Report title
 * @param {Array} params.tableData - Array of data objects
 * @param {Array} params.charts - Array of chart buffers with metadata
 * @param {Object} params.metadata - Additional metadata (date, totals, etc.)
 * @returns {Promise<Buffer>} PDF buffer
 */
async function createPdfWithCharts({ title, tableData, charts = [], metadata = {} }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        layout: 'portrait',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: title,
          Author: 'NethwinLK',
          Subject: 'Business Analytics Report',
          Creator: 'NethwinLK Analytics System'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Download logo
      const logoBuffer = await downloadLogo();

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      
      // Professional header with centered logo
      doc.rect(0, 0, pageWidth, 150)
         .fillAndStroke('#0e1a13', '#0e1a13');

      // Centered Logo - BIGGER
      if (logoBuffer) {
        try {
          // Calculate center position for logo
          const logoWidth = 120;  // Much bigger logo
          const logoX = (pageWidth - logoWidth) / 2;  // Center horizontally
          
          doc.image(logoBuffer, logoX, 20, { 
            width: logoWidth,
            // height auto-calculated to maintain aspect ratio
          });
        } catch (e) {
          console.warn('Could not embed logo:', e.message);
        }
      }

      // Large centered title below logo
      doc.fillColor('#ffffff')
         .fontSize(28)  // Larger title
         .font('Helvetica-Bold')
         .text(title, 0, 85, {
           width: pageWidth,
           align: 'center'
         });
      
      // Metadata centered
      doc.fontSize(12)  // Bigger metadata
         .font('Helvetica')
         .fillColor('#e8f2ec')
         .text(`Generated: ${metadata.date || new Date().toLocaleString()}`, 0, 115, {
           width: pageWidth,
           align: 'center'
         });
      
      if (metadata.totalRecords) {
        doc.text(`Total Records: ${metadata.totalRecords}`, 0, 130, {
           width: pageWidth,
           align: 'center'
         });
      }

      // Reset to content area
      doc.fillColor('#000000');
      let currentY = 170;

      // Content sections on same page (no blank pages)
      let hasContent = false;

      // Summary section - only if has useful metadata
      const usefulMetadata = Object.entries(metadata).filter(([key]) => 
        key !== 'date' && key !== 'title' && key !== 'totalRecords'
      );
      
      if (usefulMetadata.length > 0) {
        hasContent = true;
        
        // Bigger summary card
        const summaryHeight = 80 + (usefulMetadata.length * 18);
        doc.rect(40, currentY, pageWidth - 80, summaryHeight)
           .fillAndStroke('#f0f9ff', '#3b82f6');
        
        doc.fillColor('#1e40af')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('Report Summary', 50, currentY + 15);
        
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1e293b');
        
        let summaryY = currentY + 45;
        usefulMetadata.forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 60, summaryY);
          summaryY += 18;
        });
        
        currentY += summaryHeight + 20;
      }

      // Table section with bigger fonts to fill page
      if (tableData && tableData.length > 0) {
        hasContent = true;
        
        // Check if new page needed
        if (currentY > pageHeight - 300) {
          doc.addPage();
          currentY = 50;
        }
        
        // Table header - bigger
        doc.fillColor('#1e40af')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('Data Overview', 40, currentY);
        
        currentY += 30;
        
        // Table with ALL columns showing
        const headers = Object.keys(tableData[0]);
        const maxCols = headers.length;
        const colWidth = (pageWidth - 80) / maxCols;
        
        // Table header background - user-friendly color
        doc.rect(40, currentY, pageWidth - 80, 30)
           .fillAndStroke('#dbeafe', '#3b82f6');
        
        // Table headers - bigger font
        doc.fillColor('#1e40af')
           .fontSize(9)
           .font('Helvetica-Bold');
        
        headers.forEach((header, idx) => {
          doc.text(header, 45 + idx * colWidth, currentY + 10, { 
            width: colWidth - 5, 
            ellipsis: true 
          });
        });
        
        currentY += 30;
        
        // Table rows - show ALL columns with data
        doc.font('Helvetica').fontSize(8).fillColor('#1e293b');
        const displayRows = tableData.slice(0, 25);  // Show more rows
        
        displayRows.forEach((row, rowIdx) => {
          // Check if need new page
          if (currentY > pageHeight - 100) {
            doc.addPage();
            currentY = 50;
            
            // Redraw header on new page
            doc.rect(40, currentY, pageWidth - 80, 30)
               .fillAndStroke('#dbeafe', '#3b82f6');
            
            doc.fillColor('#1e40af')
               .fontSize(9)
               .font('Helvetica-Bold');
            
            headers.forEach((header, idx) => {
              doc.text(header, 45 + idx * colWidth, currentY + 10, { 
                width: colWidth - 5, 
                ellipsis: true 
              });
            });
            
            currentY += 30;
            doc.font('Helvetica').fontSize(8).fillColor('#1e293b');
          }
          
          // User-friendly alternating row colors
          if (rowIdx % 2 === 0) {
            doc.rect(40, currentY, pageWidth - 80, 20)
               .fillAndStroke('#f0f9ff', '#f0f9ff');
          } else {
            doc.rect(40, currentY, pageWidth - 80, 20)
               .fillAndStroke('#ffffff', '#ffffff');
          }
          
          // Show ALL columns with their data
          headers.forEach((header, colIdx) => {
            const value = String(row[header] || '');
            doc.fillColor('#1e293b')
               .text(value, 45 + colIdx * colWidth, currentY + 5, { 
                 width: colWidth - 5, 
                 ellipsis: true 
               });
          });
          currentY += 20;
        });
        
        if (tableData.length > 25) {
          doc.fontSize(11)
             .fillColor('#64748b')
             .text(`Showing 25 of ${tableData.length} total records`, 40, currentY + 10);
          currentY += 25;
        }
        
        currentY += 15;
      }

      // CHARTS SECTION - EACH CHART ON ITS OWN FULL PAGE (if charts exist)
      if (charts && charts.length > 0) {
        hasContent = true;
        
        // Filter out charts with null buffers
        const validCharts = charts.filter(c => c.buffer);
        
        validCharts.forEach((chart, idx) => {
          // EACH CHART GETS ITS OWN FULL PAGE
          doc.addPage();
          
          // Chart page header
          doc.rect(0, 0, pageWidth, 70)
             .fillAndStroke('#f0f9ff', '#f0f9ff');
          
          // Chart title - big and centered
          doc.fillColor('#1e40af')
             .fontSize(22)
             .font('Helvetica-Bold')
             .text('Visual Analytics', 0, 20, {
               width: pageWidth,
               align: 'center'
             });
          
          // Chart subtitle
          doc.fontSize(14)
             .font('Helvetica')
             .fillColor('#3b82f6')
             .text(chart.title || `Chart ${idx + 1}`, 0, 45, {
               width: pageWidth,
               align: 'center'
             });
          
          // FULL PAGE CHART
          try {
            const chartMargin = 40;
            const maxChartWidth = pageWidth - (chartMargin * 2);
            const maxChartHeight = 450;
            
            const chartX = chartMargin;
            const chartY = 100;
            
            // Chart background
            doc.rect(chartX - 10, chartY - 10, maxChartWidth + 20, maxChartHeight + 20)
               .fillAndStroke('#ffffff', '#e0e7ff');
            
            // Render chart
            doc.image(chart.buffer, chartX, chartY, { 
              fit: [maxChartWidth, maxChartHeight],
              align: 'center',
              valign: 'center'
            });
            
            // Key insights at bottom
            const insightsY = chartY + maxChartHeight + 40;
            doc.fillColor('#1e40af')
               .fontSize(13)
               .font('Helvetica-Bold')
               .text('Key Insights', chartMargin, insightsY);
            
            doc.fillColor('#475569')
               .fontSize(10)
               .font('Helvetica')
               .text('• Detailed analytics for administrative review', chartMargin, insightsY + 20)
               .text('• Real-time data from system database', chartMargin, insightsY + 35)
               .text('• Identify trends and patterns', chartMargin, insightsY + 50);
            
          } catch (e) {
            doc.fontSize(12)
               .fillColor('#dc2626')
               .text('Error rendering chart', 0, 300, {
                 width: pageWidth,
                 align: 'center'
               });
          }
          
          // Page footer
          doc.fillColor('#94a3b8')
             .fontSize(9)
             .font('Helvetica')
             .text(`Chart ${idx + 1} of ${validCharts.length}`, 0, pageHeight - 40, {
               width: pageWidth,
               align: 'center'
             });
        });
      }

      // If no content, add a message
      if (!hasContent) {
        doc.fontSize(14)
           .fillColor('#666666')
           .text('📄 No data available for this report', 60, currentY, { align: 'center' });
      }

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pages.count} | NethwinLK Report System`,
          40,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a simple HTML-based PDF (for browser print)
 * @param {Object} params
 * @param {string} params.title - Report title
 * @param {Array} params.tableData - Array of data objects
 * @param {Array} params.charts - Array of chart data URLs
 * @param {Object} params.metadata - Additional metadata
 * @returns {string} HTML string
 */
function createHtmlForPdf({ title, tableData, charts = [], metadata = {} }) {
  const chartHtml = charts.map(chart => `
    <div class="chart-container">
      <h3>${chart.title || 'Chart'}</h3>
      <img src="data:image/png;base64,${chart.buffer.toString('base64')}" alt="${chart.title}" style="max-width: 100%; height: auto;" />
    </div>
  `).join('');

  const tableRows = tableData.map(row => {
    const cells = Object.values(row).map(val => `<td>${val}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const tableHeaders = tableData.length > 0 
    ? Object.keys(tableData[0]).map(h => `<th>${h}</th>`).join('')
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-width: 150px; margin-bottom: 10px; }
        h1 { color: #333; margin: 10px 0; }
        .metadata { color: #666; font-size: 14px; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #4f46e5; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .chart-container { page-break-inside: avoid; margin: 30px 0; text-align: center; }
        .chart-container h3 { color: #4f46e5; margin-bottom: 15px; }
        @media print {
          body { margin: 0; }
          .chart-container { page-break-before: always; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
        <h1>${title}</h1>
        <p class="metadata">Generated: ${metadata.date || new Date().toLocaleString()}</p>
        ${metadata.totalRecords ? `<p class="metadata">Total Records: ${metadata.totalRecords}</p>` : ''}
      </div>

      <h2>Data Table</h2>
      <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>

      ${charts.length > 0 ? '<h2 style="page-break-before: always;">Visual Analytics</h2>' : ''}
      ${chartHtml}

      <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
        <p>NethwinLK Report System | Confidential</p>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  createPdfWithCharts,
  createHtmlForPdf
};
