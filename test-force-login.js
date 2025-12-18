// Test the force-login endpoint
// This tests the nuclear option that bypasses sessions

const API_URL = process.argv[2] || 'http://localhost:5000';

async function testForceLogin() {
  console.log('🧪 Testing Force Login Endpoint\n');
  console.log('API URL:', API_URL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    console.log('📤 Sending request to /api/auth/force-login...');
    
    const response = await fetch(`${API_URL}/api/auth/force-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'omelimeilit@gmail.com',
        password: 'test'
      })
    });
    
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    
    console.log('\n✅ RESPONSE DATA:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🎉 SUCCESS! Force login works!');
      console.log('User:', data.user.email);
      console.log('Role:', data.user.role);
      console.log('Force Login Mode:', data.forceLogin);
    } else {
      console.log('\n❌ FAILED!');
      console.log('Message:', data.message);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testForceLogin();
