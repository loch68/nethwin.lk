/**
 * Chart Renderer Module
 * Generates chart images (PNG) from data using Chart.js
 */

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Chart configuration
const CHART_WIDTH = 1200;
const CHART_HEIGHT = 600;
const CHART_BACKGROUND = 'white';

// User-friendly color schemes - modern and accessible
const DEFAULT_COLORS = [
  'rgba(59, 130, 246, 0.9)',   // Blue
  'rgba(34, 197, 94, 0.9)',    // Green
  'rgba(251, 146, 60, 0.9)',   // Orange
  'rgba(168, 85, 247, 0.9)',   // Purple
  'rgba(236, 72, 153, 0.9)',   // Pink
  'rgba(20, 184, 166, 0.9)',   // Teal
  'rgba(251, 191, 36, 0.9)',   // Amber
  'rgba(239, 68, 68, 0.9)',    // Red
  'rgba(99, 102, 241, 0.9)',   // Indigo
  'rgba(14, 165, 233, 0.9)'    // Sky Blue
];

// Color palettes for different chart types
const COLOR_PALETTES = {
  primary: DEFAULT_COLORS,
  secondary: DEFAULT_COLORS.map(color => color.replace('0.9', '0.6')),
  border: DEFAULT_COLORS.map(color => color.replace('0.9', '1'))
};

/**
 * Initialize Chart.js Node Canvas
 */
function createChartCanvas(width = CHART_WIDTH, height = CHART_HEIGHT) {
  return new ChartJSNodeCanvas({ 
    width, 
    height, 
    backgroundColour: CHART_BACKGROUND
  });
}

/**
 * Generate Chart.js configuration
 */
function generateChartConfig(type, title, labels, datasets, options = {}) {
  const baseConfig = {
    type,
    data: {
      labels,
      datasets: datasets.map((dataset, idx) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor || COLOR_PALETTES.primary[idx % COLOR_PALETTES.primary.length],
        borderColor: dataset.borderColor || COLOR_PALETTES.primary[idx % COLOR_PALETTES.primary.length],
        borderWidth: dataset.borderWidth || 2,
        fill: dataset.fill !== undefined ? dataset.fill : false
      }))
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { size: 14 },
            padding: 15
          }
        },
        title: {
          display: !!title,
          text: title,
          font: { size: 18, weight: 'bold' },
          padding: { top: 10, bottom: 20 }
        }
      },
      scales: type !== 'pie' && type !== 'doughnut' ? {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 12 } },
          grid: { color: '#e5e7eb' }
        },
        x: {
          ticks: { font: { size: 12 } },
          grid: { display: false }
        }
      } : undefined,
      ...options
    }
  };

  // Special handling for pie/doughnut charts
  if (type === 'pie' || type === 'doughnut') {
    baseConfig.data.datasets = baseConfig.data.datasets.map(dataset => ({
      ...dataset,
      backgroundColor: labels.map((_, idx) => COLOR_PALETTES.primary[idx % COLOR_PALETTES.primary.length])
    }));
  }

  return baseConfig;
}

/**
 * Render a chart to PNG buffer
 * @param {Object} params - Chart parameters
 * @param {string} params.type - Chart type: 'bar', 'line', 'pie', 'doughnut', 'horizontalBar'
 * @param {string} params.title - Chart title
 * @param {Array} params.labels - X-axis labels
 * @param {Array} params.datasets - Array of dataset objects
 * @param {Object} params.options - Additional Chart.js options
 * @param {number} params.width - Chart width in pixels
 * @param {number} params.height - Chart height in pixels
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function renderChart({ type, title, labels, datasets, options = {}, width, height }) {
  try {
    const chartCanvas = createChartCanvas(width || CHART_WIDTH, height || CHART_HEIGHT);
    const config = generateChartConfig(type, title, labels, datasets, options);
    const buffer = await chartCanvas.renderToBuffer(config, 'image/png');
    return buffer;
  } catch (error) {
    console.error('Chart rendering error:', error);
    throw new Error(`Failed to render ${type} chart: ${error.message}`);
  }
}

/**
 * Render multiple charts in parallel
 * @param {Array} chartSpecs - Array of chart specification objects
 * @returns {Promise<Array>} Array of { title, buffer, type } objects
 */
async function renderMultipleCharts(chartSpecs) {
  try {
    const promises = chartSpecs.map(async (spec) => {
      const buffer = await renderChart(spec);
      return {
        title: spec.title,
        type: spec.type,
        buffer
      };
    });
    return await Promise.all(promises);
  } catch (error) {
    console.error('Multiple chart rendering error:', error);
    throw error;
  }
}

module.exports = {
  renderChart,
  renderMultipleCharts,
  COLOR_PALETTES,
  CHART_WIDTH,
  CHART_HEIGHT
};
