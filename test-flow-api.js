#!/usr/bin/env node

// Test script to debug flow API issues

const testFlowCreation = async () => {
  console.log('🧪 Testing Flow API...\n');
  
  // Test 1: Direct backend test
  console.log('1️⃣ Testing direct backend (port 8080)...');
  try {
    const backendResponse = await fetch('http://localhost:8080/api/v1/flows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: `test-direct-${Date.now()}`,
        name: 'Test Direct Backend',
        description: 'Direct backend test',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        nodes: [],
        edges: [],
        trigger: {
          type: 'keyword',
          config: {}
        },
        apiId: 'v1'
      })
    });
    
    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log('✅ Backend direct: SUCCESS - Flow ID:', data.id);
    } else {
      const error = await backendResponse.text();
      console.log('❌ Backend direct: FAILED -', backendResponse.status, error);
    }
  } catch (error) {
    console.log('❌ Backend direct: ERROR -', error.message);
  }
  
  console.log('\n2️⃣ Testing frontend proxy (port 3000/3001/3002)...');
  
  // Try different possible frontend ports
  const frontendPorts = [3000, 3001, 3002];
  
  for (const port of frontendPorts) {
    console.log(`\n   Testing port ${port}...`);
    try {
      const proxyResponse = await fetch(`http://localhost:${port}/api/v1/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: `test-proxy-${Date.now()}`,
          name: 'Test Frontend Proxy',
          description: 'Frontend proxy test',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          nodes: [],
          edges: [],
          trigger: {
            type: 'keyword',
            config: {}
          },
          apiId: 'v1'
        })
      });
      
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        console.log(`   ✅ Frontend proxy (${port}): SUCCESS - Flow ID:`, data.id);
      } else {
        const error = await proxyResponse.text();
        console.log(`   ❌ Frontend proxy (${port}): FAILED -`, proxyResponse.status, error);
      }
    } catch (error) {
      console.log(`   ⚠️  Frontend proxy (${port}): Not available -`, error.message);
    }
  }
  
  console.log('\n3️⃣ Testing with complex flow data...');
  try {
    const complexFlow = {
      id: `test-complex-${Date.now()}`,
      name: 'Complex Flow Test',
      description: 'Testing with nodes and edges',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      nodes: [
        {
          id: 'node-1',
          type: 'trigger_template_button',
          position: { x: 100, y: 100 },
          data: {
            label: 'Test Trigger',
            description: 'Test trigger node',
            config: {
              templateName: 'test_template',
              captureAll: true
            },
            icon: 'MousePointer',
            color: '#22c55e'
          }
        },
        {
          id: 'node-2',
          type: 'msg_text',
          position: { x: 300, y: 100 },
          data: {
            label: 'Send Message',
            description: 'Test message node',
            config: {
              message: 'Hello World',
              typingDelay: 0
            },
            icon: 'MessageSquare',
            color: '#3b82f6'
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'smoothstep'
        }
      ],
      trigger: {
        type: 'keyword',
        config: {}
      },
      apiId: 'v1'
    };
    
    const complexResponse = await fetch('http://localhost:8080/api/v1/flows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(complexFlow)
    });
    
    if (complexResponse.ok) {
      const data = await complexResponse.json();
      console.log('✅ Complex flow: SUCCESS - Flow ID:', data.id);
    } else {
      const error = await complexResponse.text();
      console.log('❌ Complex flow: FAILED -', complexResponse.status, error);
    }
  } catch (error) {
    console.log('❌ Complex flow: ERROR -', error.message);
  }
  
  console.log('\n4️⃣ Checking existing flows...');
  try {
    const listResponse = await fetch('http://localhost:8080/api/v1/flows');
    if (listResponse.ok) {
      const flows = await listResponse.json();
      console.log(`✅ Found ${flows.length} existing flows`);
      
      // Check for duplicate IDs
      const ids = flows.map(f => f.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.log('⚠️  Warning: Duplicate flow IDs detected!');
      }
    } else {
      console.log('❌ Failed to list flows');
    }
  } catch (error) {
    console.log('❌ Error listing flows:', error.message);
  }
  
  console.log('\n📊 Test Summary:');
  console.log('- Backend API is at: http://localhost:8080/api/v1/flows');
  console.log('- Frontend proxy should forward to backend');
  console.log('- All flows require "apiId": "v1" field');
  console.log('- Flow IDs should be unique');
  
  console.log('\n🔍 Debugging Tips:');
  console.log('1. Check browser console for detailed error messages');
  console.log('2. Check network tab to see actual request/response');
  console.log('3. Verify frontend .env has correct NEXT_PUBLIC_API_URL');
  console.log('4. Ensure no duplicate flow IDs are being used');
};

// Run the test
testFlowCreation().catch(console.error);