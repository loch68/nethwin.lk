/**
 * CSV Exporter with Companion Visual Report
 * Creates CSV files and optional companion PDF/Excel with charts
 */

const archiver = require('archiver');
const { createPdfWithCharts } = require('./pdfExporter');
const { createExcelWithCharts } = require('./excelExporter');

/**
 * Convert data array to CSV string
 * @param {Array} data - Array of objects
 * @returns {string} CSV string
 */
function arrayToCsv(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.map(h => `"${h}"`).join(','));

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      const escaped = String(value || '').replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Create CSV file with optional companion visual report
 * @param {Object} params
 * @param {string} params.filename - Base filename (without extension)
 * @param {Array} params.data - Array of data objects
 * @param {Array} params.charts - Optional array of chart buffers
 * @param {string} params.companionFormat - 'pdf' or 'excel' for companion file
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} { csv: Buffer, companion?: Buffer, format: string }
 */
async function createCsvWithCompanion({ filename, data, charts = [], companionFormat = 'pdf', metadata = {} }) {
  try {
    // Generate CSV
    const csvString = arrayToCsv(data);
    const csvBuffer = Buffer.from(csvString, 'utf-8');

    // If no charts requested, return CSV only
    if (!charts || charts.length === 0) {
      return {
        csv: csvBuffer,
        format: 'csv'
      };
    }

    // Generate companion file with charts
    let companionBuffer;
    if (companionFormat === 'pdf') {
      companionBuffer = await createPdfWithCharts({
        title: metadata.title || filename,
        tableData: data.slice(0, 100), // Limit table rows in companion
        charts,
        metadata
      });
    } else if (companionFormat === 'excel') {
      companionBuffer = await createExcelWithCharts({
        title: metadata.title || filename,
        tableData: data,
        charts,
        metadata
      });
    }

    return {
      csv: csvBuffer,
      companion: companionBuffer,
      companionFormat,
      format: 'zip'
    };
  } catch (error) {
    console.error('CSV with companion generation error:', error);
    throw error;
  }
}

/**
 * Create a ZIP archive with CSV and companion file
 * @param {Object} params
 * @param {string} params.filename - Base filename
 * @param {Buffer} params.csvBuffer - CSV buffer
 * @param {Buffer} params.companionBuffer - Companion file buffer
 * @param {string} params.companionFormat - 'pdf' or 'excel'
 * @returns {Promise<Buffer>} ZIP buffer
 */
async function createZipArchive({ filename, csvBuffer, companionBuffer, companionFormat }) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    // Add CSV file
    archive.append(csvBuffer, { name: `${filename}.csv` });

    // Add companion file
    if (companionBuffer) {
      const ext = companionFormat === 'pdf' ? 'pdf' : 'xlsx';
      archive.append(companionBuffer, { name: `${filename}_charts.${ext}` });
    }

    archive.finalize();
  });
}

/**
 * Helper to send CSV response (with or without companion)
 * @param {Object} res - Express response object
 * @param {Object} result - Result from createCsvWithCompanion
 * @param {string} filename - Base filename
 */
async function sendCsvResponse(res, result, filename) {
  try {
    if (result.format === 'csv') {
      // CSV only
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(result.csv);
    } else if (result.format === 'zip') {
      // CSV + companion in ZIP
      const zipBuffer = await createZipArchive({
        filename,
        csvBuffer: result.csv,
        companionBuffer: result.companion,
        companionFormat: result.companionFormat
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_with_charts.zip"`);
      res.send(zipBuffer);
    }
  } catch (error) {
    console.error('CSV response error:', error);
    throw error;
  }
}

module.exports = {
  arrayToCsv,
  createCsvWithCompanion,
  createZipArchive,
  sendCsvResponse
};
