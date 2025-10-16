/**
 * Test Chart Generation
 * Run this to verify chart rendering is working
 */

const { renderMultipleCharts } = require('./src/charts/chartRenderer');

async function testCharts() {
  console.log('🧪 Testing chart generation...\n');
  
  const testSpecs = [
    {
      type: 'pie',
      title: 'Test Pie Chart',
      labels: ['Option A', 'Option B', 'Option C'],
      datasets: [{ 
        label: 'Test Data', 
        data: [30, 50, 20]
      }]
    },
    {
      type: 'bar',
      title: 'Test Bar Chart',
      labels: ['Jan', 'Feb', 'Mar', 'Apr'],
      datasets: [{ 
        label: 'Sales', 
        data: [100, 150, 120, 180]
      }]
    }
  ];

  try {
    console.log('Generating charts...');
    const charts = await renderMultipleCharts(testSpecs);
    
    if (charts.length === 0) {
      console.error('❌ No charts generated!');
      console.log('\n📦 Please install required packages:');
      console.log('   cd backend');
      console.log('   npm install canvas chartjs-node-canvas');
      return;
    }
    
    console.log(`✅ Successfully generated ${charts.length} charts`);
    charts.forEach((chart, idx) => {
      console.log(`   ${idx + 1}. ${chart.title} (${chart.type}) - ${chart.buffer ? 'OK' : 'FAILED'}`);
      if (chart.buffer) {
        console.log(`      Buffer size: ${(chart.buffer.length / 1024).toFixed(2)} KB`);
      }
    });
    
    console.log('\n✅ Chart generation is working correctly!');
    
  } catch (error) {
    console.error('❌ Chart generation failed:', error.message);
    console.log('\n📦 Try reinstalling packages:');
    console.log('   cd backend');
    console.log('   npm install');
  }
}

testCharts();
