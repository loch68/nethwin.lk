/**
 * Enhanced Excel Exporter with Chart Support and NethwinLK Branding
 * Uses ExcelJS for creating Excel files with embedded chart images
 */

const ExcelJS = require('exceljs');
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
    console.warn('Could not download NethwinLK logo for Excel:', error.message);
    return null;
  }
}

/**
 * Create an Excel workbook with data and chart images
 * @param {Object} params
 * @param {string} params.title - Workbook title
 * @param {Array} params.tableData - Array of data objects
 * @param {Array} params.charts - Array of chart buffers with metadata
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Buffer>} Excel buffer
 */
async function createExcelWithCharts({ title, tableData, charts = [], metadata = {} }) {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties with NethwinLK branding
    workbook.creator = 'NethwinLK Analytics System';
    workbook.company = 'NethwinLK';
    workbook.title = title;
    workbook.subject = 'Business Analytics Report';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    // Download logo
    const logoBuffer = await downloadLogo();

    // Data Sheet
    const dataSheet = workbook.addWorksheet('Data', {
      properties: { tabColor: { argb: '4F46E5' } },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    if (tableData && tableData.length > 0) {
      // Add headers
      const headers = Object.keys(tableData[0]);
      dataSheet.addRow(headers);

      // Style header row
      const headerRow = dataSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F46E5' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add data rows
      tableData.forEach(row => {
        dataSheet.addRow(Object.values(row));
      });

      // Auto-fit columns
      dataSheet.columns.forEach((column, idx) => {
        let maxLength = headers[idx]?.length || 10;
        column.eachCell({ includeEmpty: false }, cell => {
          const cellLength = cell.value ? String(cell.value).length : 0;
          maxLength = Math.max(maxLength, cellLength);
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Add borders to all cells
      dataSheet.eachRow((row, rowNumber) => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Alternate row colors
      for (let i = 2; i <= dataSheet.rowCount; i++) {
        if (i % 2 === 0) {
          dataSheet.getRow(i).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F9FAFB' }
          };
        }
      }
    }

    // Summary Sheet with Logo
    const summarySheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: '0E1A13' } }
    });

    // Add logo if available
    if (logoBuffer) {
      try {
        const logoId = workbook.addImage({
          buffer: logoBuffer,
          extension: 'png',
        });
        
        summarySheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 120, height: 80 }
        });
      } catch (e) {
        console.warn('Could not add logo to Excel:', e.message);
      }
    }

    // Title with NethwinLK branding
    summarySheet.mergeCells('C1:F2');
    const titleCell = summarySheet.getCell('C1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 20, color: { argb: '0E1A13' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F8FBFA' }
    };
    summarySheet.getRow(1).height = 25;
    summarySheet.getRow(2).height = 25;

    // Company info
    summarySheet.mergeCells('C3:F3');
    const companyCell = summarySheet.getCell('C3');
    companyCell.value = 'NethwinLK Analytics System';
    companyCell.font = { bold: false, size: 12, color: { argb: '51946C' } };
    companyCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Report details section
    summarySheet.addRow([]);
    summarySheet.addRow([]);
    summarySheet.addRow(['📊 Report Details', '', '', '', '', '']);
    const detailsHeaderRow = summarySheet.getRow(6);
    detailsHeaderRow.font = { bold: true, size: 14, color: { argb: '0E1A13' } };
    detailsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E8F2EC' }
    };

    summarySheet.addRow(['Report Date:', metadata.date || new Date().toLocaleString()]);
    if (metadata.totalRecords) {
      summarySheet.addRow(['Total Records:', metadata.totalRecords]);
    }
    
    // Add metadata if available
    Object.entries(metadata).forEach(([key, value]) => {
      if (key !== 'date' && key !== 'title' && key !== 'totalRecords') {
        summarySheet.addRow([`${key}:`, value]);
      }
    });

    summarySheet.addRow(['Generated By:', 'NethwinLK Report System']);
    summarySheet.addRow(['Report Version:', '1.0']);

    // Column widths
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 40;
    summarySheet.getColumn(3).width = 20;
    summarySheet.getColumn(4).width = 20;
    summarySheet.getColumn(5).width = 20;
    summarySheet.getColumn(6).width = 20;

    // Charts Sheet
    if (charts && charts.length > 0) {
      const chartsSheet = workbook.addWorksheet('Charts', {
        properties: { tabColor: { argb: 'F59E0B' } }
      });

      chartsSheet.mergeCells('A1:H1');
      const chartsTitle = chartsSheet.getCell('A1');
      chartsTitle.value = 'Visual Analytics';
      chartsTitle.font = { bold: true, size: 16, color: { argb: '4F46E5' } };
      chartsTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      chartsSheet.getRow(1).height = 30;

      let currentRow = 3;

      for (const chart of charts) {
        try {
          // Add chart title
          chartsSheet.mergeCells(`A${currentRow}:H${currentRow}`);
          const chartTitleCell = chartsSheet.getCell(`A${currentRow}`);
          chartTitleCell.value = chart.title || 'Chart';
          chartTitleCell.font = { bold: true, size: 14, color: { argb: '1F2937' } };
          chartTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
          chartsSheet.getRow(currentRow).height = 25;
          currentRow += 1;

          // Add image
          const imageId = workbook.addImage({
            buffer: chart.buffer,
            extension: 'png'
          });

          chartsSheet.addImage(imageId, {
            tl: { col: 0, row: currentRow },
            ext: { width: 1000, height: 500 }
          });

          // Reserve rows for image (approximate)
          currentRow += 28; // ~500px / 18px per row

          // Add spacing
          currentRow += 2;
        } catch (error) {
          console.error('Error adding chart to Excel:', error);
        }
      }

      // Set column widths for charts sheet
      for (let i = 1; i <= 8; i++) {
        chartsSheet.getColumn(i).width = 15;
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new Error(`Failed to create Excel file: ${error.message}`);
  }
}

/**
 * Create a simple Excel file without charts (fallback to XLSX library)
 * @param {Object} params
 * @param {string} params.sheetName - Sheet name
 * @param {Array} params.data - Array of data objects
 * @returns {Buffer} Excel buffer
 */
function createSimpleExcel({ sheetName, data }) {
  const XLSX = require('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  createExcelWithCharts,
  createSimpleExcel
};
