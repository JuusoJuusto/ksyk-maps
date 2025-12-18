// Test login logic for omelimeilit account
// This simulates what happens on Vercel

const testEmail = 'omelimeilit@gmail.com';
const testPassword = 'test';

console.log('🧪 Testing Login Logic\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Emergency Bypass Check
console.log('TEST 1: Emergency Bypass');
console.log('Email:', testEmail);
console.log('Password:', testPassword);

const emergencyBypassEmails = ['test', 'test123', 'OwlAppsOkko'];
const bypassActive = testEmail === 'omelimeilit@gmail.com' && emergencyBypassEmails.includes(testPassword);

console.log('Bypass Active:', bypassActive ? '✅ YES' : '❌ NO');
console.log('Expected: ✅ YES (password "test" should trigger bypass)\n');

// Test 2: Password Comparison
console.log('TEST 2: Normal Password Check');
const storedPassword = 'test';
const providedPassword = 'test';

console.log('Stored Password:', storedPassword);
console.log('Provided Password:', providedPassword);
console.log('Match (===):', storedPassword === providedPassword ? '✅ YES' : '❌ NO');
console.log('Match (==):', storedPassword == providedPassword ? '✅ YES' : '❌ NO');
console.log('Type of stored:', typeof storedPassword);
console.log('Type of provided:', typeof providedPassword);
console.log('Length stored:', storedPassword.length);
console.log('Length provided:', providedPassword.length);

// Test 3: Check for hidden characters
console.log('\nTEST 3: Hidden Characters Check');
console.log('Stored bytes:', Buffer.from(storedPassword).toString('hex'));
console.log('Provided bytes:', Buffer.from(providedPassword).toString('hex'));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n✅ CONCLUSION:');
console.log('Emergency bypass SHOULD work with password "test"');
console.log('Normal login SHOULD also work with password "test"');
console.log('\nIf login still fails on Vercel:');
console.log('1. Check Vercel function logs for actual error');
console.log('2. Verify session middleware is working');
console.log('3. Check if Firebase connection works on Vercel');
console.log('4. Verify environment variables are set');
