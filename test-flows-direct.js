const http = require('http');

// Test direct backend connection
const testBackend = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8081,
      path: '/api/v1/flows',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('✅ Backend direct test:', parsed.flows?.length, 'flows found');
          resolve(parsed);
        } catch (e) {
          console.error('❌ Backend parse error:', e);
          reject(e);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Backend request error:', err);
      reject(err);
    });
    
    req.end();
  });
};

// Run test
testBackend()
  .then(() => console.log('🎉 Test completed successfully'))
  .catch(() => console.log('💥 Test failed'));