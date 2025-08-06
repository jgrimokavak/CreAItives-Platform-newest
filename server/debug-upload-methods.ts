import { Client } from '@replit/object-storage';

/**
 * Find the correct upload method name
 */
async function findUploadMethod() {
  console.log('🔍 Finding correct upload method...');
  
  const client = new Client();
  
  console.log('📋 Available methods on client:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
  
  // Test different potential method names
  const testMethods = [
    'upload',
    'uploadFromBuffer', 
    'uploadFromBytes',
    'put',
    'create',
    'store'
  ];
  
  for (const methodName of testMethods) {
    if (typeof (client as any)[methodName] === 'function') {
      console.log(`✅ Found method: ${methodName}`);
      
      // Try to use it
      try {
        const testData = Buffer.from('test', 'utf-8');
        const result = await (client as any)[methodName]('test-path.txt', testData);
        console.log(`✅ ${methodName} succeeded:`, result);
        break;
      } catch (e) {
        console.log(`❌ ${methodName} failed:`, e.message);
      }
    } else {
      console.log(`❌ Method ${methodName} not found`);
    }
  }
}

findUploadMethod();