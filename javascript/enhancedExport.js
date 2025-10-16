/**
 * Enhanced Export Module with Chart Support
 * Frontend JavaScript for triggering enhanced exports with visual analytics
 */

class EnhancedExportManager {
  constructor() {
    // Use the current origin to support any port
    this.baseUrl = window.location.origin || 'http://localhost:4000';
  }

  /**
   * Show export modal with options
   * @param {string} reportType - 'products', 'users', 'printOrders'
   * @param {string} endpoint - API endpoint for enhanced export
   */
  showExportModal(reportType, endpoint) {
    const modal = this.createExportModal(reportType, endpoint);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }

  /**
   * Create export modal HTML
   */
  createExportModal(reportType, endpoint) {
    const modal = document.createElement('div');
    modal.id = 'enhancedExportModal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      z-index: 10000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #1f2937; font-size: 24px;">Enhanced Export</h2>
          <button onclick="this.closest('#enhancedExportModal').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280;">&times;</button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Export Format</label>
          <select id="exportFormat" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
            <option value="pdf">PDF Document</option>
            <option value="excel">Excel Spreadsheet (.xlsx)</option>
            <option value="csv">CSV with Charts (ZIP)</option>
          </select>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="includeCharts" checked style="width: 18px; height: 18px; margin-right: 10px; cursor: pointer;">
            <span style="font-weight: 600; color: #374151;">Include Visual Charts</span>
          </label>
        </div>

        <div id="chartOptionsContainer" style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Chart Types</label>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" name="chartType" value="pie" checked style="margin-right: 8px; cursor: pointer;">
              <span style="color: #4b5563;">Pie Chart (Distribution)</span>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" name="chartType" value="bar" checked style="margin-right: 8px; cursor: pointer;">
              <span style="color: #4b5563;">Bar Chart (Comparison)</span>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" name="chartType" value="line" style="margin-right: 8px; cursor: pointer;">
              <span style="color: #4b5563;">Line Chart (Trends)</span>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" name="chartType" value="doughnut" style="margin-right: 8px; cursor: pointer;">
              <span style="color: #4b5563;">Doughnut Chart (Status)</span>
            </label>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 25px;">
          <button onclick="this.closest('#enhancedExportModal').remove()" style="flex: 1; padding: 12px; background: #e5e7eb; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; color: #374151;">
            Cancel
          </button>
          <button id="exportButton" style="flex: 1; padding: 12px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Export Report
          </button>
        </div>

        <div id="exportStatus" style="margin-top: 15px; padding: 10px; border-radius: 6px; display: none;"></div>
      </div>
    `;

    // Event listeners
    const includeChartsCheckbox = modal.querySelector('#includeCharts');
    const chartOptionsContainer = modal.querySelector('#chartOptionsContainer');
    
    includeChartsCheckbox.addEventListener('change', (e) => {
      chartOptionsContainer.style.display = e.target.checked ? 'block' : 'none';
    });

    const exportButton = modal.querySelector('#exportButton');
    exportButton.addEventListener('click', () => {
      this.executeExport(modal, endpoint);
    });

    return modal;
  }

  /**
   * Execute the export
   */
  async executeExport(modal, endpoint) {
    const format = modal.querySelector('#exportFormat').value;
    const includeCharts = modal.querySelector('#includeCharts').checked;
    const chartTypeCheckboxes = modal.querySelectorAll('input[name="chartType"]:checked');
    const chartTypes = Array.from(chartTypeCheckboxes).map(cb => cb.value).join(',');
    const statusDiv = modal.querySelector('#exportStatus');
    const exportButton = modal.querySelector('#exportButton');

    // Validation
    if (includeCharts && chartTypes.length === 0) {
      this.showStatus(statusDiv, 'Please select at least one chart type', 'error');
      return;
    }

    // Show loading
    exportButton.disabled = true;
    exportButton.textContent = 'Generating...';
    this.showStatus(statusDiv, 'Generating your report with charts...', 'info');

    try {
      // Build URL with query parameters
      const url = new URL(`${this.baseUrl}${endpoint}`);
      url.searchParams.append('format', format);
      url.searchParams.append('includeCharts', includeCharts);
      if (includeCharts && chartTypes) {
        url.searchParams.append('chartTypes', chartTypes);
      }

      // Fetch the export
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'report';
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches) filename = matches[1];
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      this.showStatus(statusDiv, 'Export completed successfully!', 'success');
      
      setTimeout(() => {
        modal.remove();
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      this.showStatus(statusDiv, `Error: ${error.message}`, 'error');
      exportButton.disabled = false;
      exportButton.textContent = 'Export Report';
    }
  }

  /**
   * Show status message
   */
  showStatus(statusDiv, message, type) {
    const colors = {
      info: { bg: '#dbeafe', text: '#1e40af' },
      success: { bg: '#d1fae5', text: '#065f46' },
      error: { bg: '#fee2e2', text: '#991b1b' }
    };

    statusDiv.style.display = 'block';
    statusDiv.style.backgroundColor = colors[type].bg;
    statusDiv.style.color = colors[type].text;
    statusDiv.textContent = message;
  }
}

// Initialize global instance
const enhancedExportManager = new EnhancedExportManager();

/**
 * Quick export functions for easy integration
 */
function exportProductsEnhanced() {
  enhancedExportManager.showExportModal('products', '/api/products/export/catalog/enhanced');
}

function exportUsersEnhancedModal() {
  enhancedExportManager.showExportModal('users', '/api/users/export/enhanced');
}

function exportPrintOrdersEnhanced() {
  enhancedExportManager.showExportModal('printOrders', '/api/admin/print-orders/export/enhanced');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedExportManager, enhancedExportManager };
}
