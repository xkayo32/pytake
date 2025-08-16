const http = require('http');

// Function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`📄 ${path} - Status: ${res.statusCode}`);
        
        // Check if it's a redirect
        if (res.statusCode === 302 || res.statusCode === 301) {
          console.log(`↩️  Redirect to: ${res.headers.location}`);
        }
        
        // Check for flows-specific content
        if (data.includes('flows') || data.includes('Flows')) {
          console.log('✅ Page contains flows content');
        }
        
        if (data.includes('API proxy')) {
          console.log('✅ Page making API calls');
        }
        
        if (data.includes('Carregando flows')) {
          console.log('✅ Page has loading state for flows');
        }
        
        if (data.includes('Nenhum flow encontrado')) {
          console.log('✅ Page has empty state message');
        }
        
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    
    req.on('error', (err) => {
      console.error(`❌ ${path} request error:`, err.message);
      reject(err);
    });
    
    req.end();
  });
}

async function testFlowsPage() {
  console.log('🔍 Testing flows page functionality...\n');
  
  try {
    // Test API endpoint
    console.log('1. Testing API endpoint:');
    const apiResult = await makeRequest('/api/v1/flows');
    
    // Test flows page
    console.log('\n2. Testing flows page:');
    const pageResult = await makeRequest('/flows');
    
    console.log('\n🎯 Summary:');
    console.log(`- API endpoint: ${apiResult.status === 200 ? '✅ Working' : '❌ Failed'}`);
    console.log(`- Flows page: ${pageResult.status === 200 ? '✅ Loading' : '↩️ Redirecting'}`);
    
    if (apiResult.status === 200) {
      try {
        const flows = JSON.parse(apiResult.data);
        console.log(`- Database flows: ✅ ${flows.flows?.length || 0} flows found`);
      } catch (e) {
        console.log('- Database flows: ❌ Invalid JSON response');
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testFlowsPage();