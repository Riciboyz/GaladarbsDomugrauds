// Debug script to test threads loading
const fetch = require('node-fetch');

async function debugThreads() {
  console.log('🔍 Debugging threads loading...\n');

  try {
    // Test 1: Check API response
    console.log('1️⃣ Testing API response...');
    const response = await fetch('http://localhost:3000/api/threads');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API response successful');
      console.log('📊 Threads count:', data.threads.length);
      console.log('📝 Threads data:', JSON.stringify(data.threads, null, 2));
      
      // Test 2: Check data types
      console.log('\n2️⃣ Testing data types...');
      data.threads.forEach((thread, index) => {
        console.log(`Thread ${index + 1}:`);
        console.log(`  - ID: ${typeof thread.id} = ${thread.id}`);
        console.log(`  - Author ID: ${typeof thread.authorId} = ${thread.authorId}`);
        console.log(`  - Content: ${typeof thread.content} = ${thread.content}`);
        console.log(`  - Created At: ${typeof thread.createdAt} = ${thread.createdAt}`);
        console.log(`  - Visibility: ${typeof thread.visibility} = ${thread.visibility}`);
        console.log('');
      });
      
      // Test 3: Check date conversion
      console.log('3️⃣ Testing date conversion...');
      data.threads.forEach((thread, index) => {
        const originalDate = thread.createdAt;
        const convertedDate = new Date(thread.createdAt);
        console.log(`Thread ${index + 1}:`);
        console.log(`  - Original: ${originalDate} (${typeof originalDate})`);
        console.log(`  - Converted: ${convertedDate} (${typeof convertedDate})`);
        console.log(`  - Valid: ${!isNaN(convertedDate.getTime())}`);
        console.log('');
      });
      
    } else {
      console.log('❌ API response failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugThreads();
