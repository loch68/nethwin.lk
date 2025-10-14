/**
 * Test Script for Enhanced Export System
 * Run: node test-enhanced-export.js
 */

const { renderChart, renderMultipleCharts } = require('./src/charts/chartRenderer');
const { aggregateProductData } = require('./src/charts/chartDataAggregator');
const { createPdfWithCharts } = require('./src/exporters/pdfExporter');
const { createExcelWithCharts } = require('./src/exporters/excelExporter');
const { createCsvWithCompanion } = require('./src/exporters/csvExporter');
const fs = require('fs');
const path = require('path');

// Sample test data
const sampleProducts = [
  { name: 'Book 1', category: 'Fiction', stock: 50, sellingPrice: 1200, status: 'active' },
  { name: 'Book 2', category: 'Non-Fiction', stock: 30, sellingPrice: 1500, status: 'active' },
  { name: 'Book 3', category: 'Fiction', stock: 20, sellingPrice: 800, status: 'active' },
  { name: 'Book 4', category: 'Science', stock: 15, sellingPrice: 2000, status: 'active' },
  { name: 'Book 5', category: 'Fiction', stock: 40, sellingPrice: 1000, status: 'active' },
  { name: 'Book 6', category: 'Non-Fiction', stock: 25, sellingPrice: 1800, status: 'active' },
  { name: 'Book 7', category: 'Science', stock: 10, sellingPrice: 2500, status: 'active' },
  { name: 'Book 8', category: 'Fiction', stock: 35, sellingPrice: 900, status: 'active' }
];

async function testChartRendering() {
  console.log('\n🧪 Test 1: Chart Rendering');
  console.log('━'.repeat(50));
  
  try {
    const chartBuffer = await renderChart({
      type: 'bar',
      title: 'Test Bar Chart',
      labels: ['Jan', 'Feb', 'Mar', 'Apr'],
      datasets: [{ label: 'Sales', data: [120, 150, 180, 200] }]
    });
    
    console.log('✅ Chart rendered successfully');
    console.log(`   Buffer size: ${chartBuffer.length} bytes`);
    
    // Save test chart
    const outputPath = path.join(__dirname, 'test-output', 'test-chart.png');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, chartBuffer);
    console.log(`   Saved to: ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Chart rendering failed:', error.message);
    return false;
  }
}

async function testMultipleCharts() {
  console.log('\n🧪 Test 2: Multiple Charts Rendering');
  console.log('━'.repeat(50));
  
  try {
    const chartSpecs = [
      {
        type: 'pie',
        title: 'Category Distribution',
        labels: ['Fiction', 'Non-Fiction', 'Science'],
        datasets: [{ label: 'Books', data: [4, 2, 2] }]
      },
      {
        type: 'bar',
        title: 'Stock by Category',
        labels: ['Fiction', 'Non-Fiction', 'Science'],
        datasets: [{ label: 'Stock', data: [145, 55, 25] }]
      }
    ];
    
    const charts = await renderMultipleCharts(chartSpecs);
    
    console.log(`✅ ${charts.length} charts rendered successfully`);
    charts.forEach((chart, idx) => {
      console.log(`   Chart ${idx + 1}: ${chart.title} (${chart.buffer.length} bytes)`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Multiple charts rendering failed:', error.message);
    return false;
  }
}

async function testDataAggregation() {
  console.log('\n🧪 Test 3: Data Aggregation');
  console.log('━'.repeat(50));
  
  try {
    const aggregated = aggregateProductData(sampleProducts);
    
    console.log('✅ Data aggregated successfully');
    console.log('   Category Distribution:', aggregated.categoryDistribution);
    console.log('   Category Stock:', aggregated.categoryStock);
    console.log('   Price Distribution:', aggregated.priceDistribution);
    
    return true;
  } catch (error) {
    console.error('❌ Data aggregation failed:', error.message);
    return false;
  }
}

async function testPdfGeneration() {
  console.log('\n🧪 Test 4: PDF Generation with Charts');
  console.log('━'.repeat(50));
  
  try {
    // Generate charts
    const charts = await renderMultipleCharts([
      {
        type: 'pie',
        title: 'Product Distribution',
        labels: ['Fiction', 'Non-Fiction', 'Science'],
        datasets: [{ label: 'Products', data: [4, 2, 2] }]
      }
    ]);
    
    // Generate PDF
    const tableData = sampleProducts.map(p => ({
      'Title': p.name,
      'Category': p.category,
      'Stock': p.stock,
      'Price': p.sellingPrice
    }));
    
    const pdfBuffer = await createPdfWithCharts({
      title: 'Test Product Report',
      tableData,
      charts,
      metadata: {
        date: new Date().toLocaleString(),
        totalRecords: sampleProducts.length
      }
    });
    
    console.log('✅ PDF generated successfully');
    console.log(`   PDF size: ${pdfBuffer.length} bytes`);
    
    // Save test PDF
    const outputPath = path.join(__dirname, 'test-output', 'test-report.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`   Saved to: ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function testExcelGeneration() {
  console.log('\n🧪 Test 5: Excel Generation with Charts');
  console.log('━'.repeat(50));
  
  try {
    // Generate charts
    const charts = await renderMultipleCharts([
      {
        type: 'bar',
        title: 'Stock Analysis',
        labels: ['Fiction', 'Non-Fiction', 'Science'],
        datasets: [{ label: 'Stock', data: [145, 55, 25] }]
      }
    ]);
    
    // Generate Excel
    const tableData = sampleProducts.map(p => ({
      'Title': p.name,
      'Category': p.category,
      'Stock': p.stock,
      'Price': p.sellingPrice
    }));
    
    const excelBuffer = await createExcelWithCharts({
      title: 'Test Product Report',
      tableData,
      charts,
      metadata: {
        date: new Date().toLocaleString(),
        totalRecords: sampleProducts.length
      }
    });
    
    console.log('✅ Excel generated successfully');
    console.log(`   Excel size: ${excelBuffer.length} bytes`);
    
    // Save test Excel
    const outputPath = path.join(__dirname, 'test-output', 'test-report.xlsx');
    fs.writeFileSync(outputPath, excelBuffer);
    console.log(`   Saved to: ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Excel generation failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function testCsvWithCompanion() {
  console.log('\n🧪 Test 6: CSV with Companion PDF');
  console.log('━'.repeat(50));
  
  try {
    // Generate charts
    const charts = await renderMultipleCharts([
      {
        type: 'pie',
        title: 'Category Distribution',
        labels: ['Fiction', 'Non-Fiction', 'Science'],
        datasets: [{ label: 'Products', data: [4, 2, 2] }]
      }
    ]);
    
    // Generate CSV with companion
    const tableData = sampleProducts.map(p => ({
      'Title': p.name,
      'Category': p.category,
      'Stock': p.stock,
      'Price': p.sellingPrice
    }));
    
    const result = await createCsvWithCompanion({
      filename: 'test-report',
      data: tableData,
      charts,
      companionFormat: 'pdf',
      metadata: {
        title: 'Test Product Report',
        date: new Date().toLocaleString(),
        totalRecords: sampleProducts.length
      }
    });
    
    console.log('✅ CSV with companion generated successfully');
    console.log(`   CSV size: ${result.csv.length} bytes`);
    console.log(`   Companion size: ${result.companion.length} bytes`);
    console.log(`   Format: ${result.format}`);
    
    // Save files
    const csvPath = path.join(__dirname, 'test-output', 'test-report.csv');
    const pdfPath = path.join(__dirname, 'test-output', 'test-report_charts.pdf');
    fs.writeFileSync(csvPath, result.csv);
    fs.writeFileSync(pdfPath, result.companion);
    console.log(`   Saved CSV to: ${csvPath}`);
    console.log(`   Saved companion to: ${pdfPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ CSV with companion generation failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Enhanced Export System - Test Suite         ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  const results = [];
  
  results.push(await testChartRendering());
  results.push(await testMultipleCharts());
  results.push(await testDataAggregation());
  results.push(await testPdfGeneration());
  results.push(await testExcelGeneration());
  results.push(await testCsvWithCompanion());
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Test Results Summary                         ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n   Total Tests: ${total}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${total - passed}`);
  
  if (passed === total) {
    console.log('\n   🎉 All tests passed! System is ready to use.\n');
  } else {
    console.log('\n   ⚠️  Some tests failed. Please check the errors above.\n');
  }
  
  console.log('   Test output files saved to: backend/test-output/\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
