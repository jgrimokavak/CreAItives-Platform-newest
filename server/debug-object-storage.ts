import { Client } from '@replit/object-storage';

/**
 * Debug Object Storage API to understand the correct usage
 */
async function debugObjectStorage() {
  console.log('🔍 Debugging Object Storage API...');
  
  try {
    const client = new Client();
    
    console.log('✅ Client created successfully');
    
    // Try different list methods to understand the API
    console.log('🔎 Testing list() method...');
    
    try {
      const result1 = await client.list();
      console.log('📊 list() result:', {
        type: typeof result1,
        isArray: Array.isArray(result1),
        keys: result1 ? Object.keys(result1) : 'null/undefined',
        length: Array.isArray(result1) ? result1.length : 'not array'
      });
      
      if (result1 && typeof result1 === 'object') {
        console.log('📋 First few entries:', JSON.stringify(result1, null, 2).substring(0, 500));
      }
    } catch (e) {
      console.log('❌ list() failed:', e);
    }

    // Try with a prefix
    try {
      const result2 = await client.list('dev/');
      console.log('📊 list("dev/") result:', {
        type: typeof result2,
        isArray: Array.isArray(result2),
        keys: result2 ? Object.keys(result2) : 'null/undefined'
      });
    } catch (e) {
      console.log('❌ list("dev/") failed:', e);
    }
    
    // Try a simple upload to test the upload API
    console.log('📤 Testing upload...');
    const testData = Buffer.from('test-object-storage-integration', 'utf-8');
    
    try {
      const uploadResult = await client.upload('test/debug.txt', testData);
      console.log('✅ Upload successful:', uploadResult);
      
      // Try to list again after upload
      const listAfterUpload = await client.list();
      console.log('📋 After upload, list result:', {
        type: typeof listAfterUpload,
        length: Array.isArray(listAfterUpload) ? listAfterUpload.length : 'not array'
      });
      
    } catch (e) {
      console.log('❌ Upload failed:', e);
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugObjectStorage();