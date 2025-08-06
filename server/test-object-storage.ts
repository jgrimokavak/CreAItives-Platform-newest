import { objectStorage } from './objectStorage';

/**
 * Test Object Storage integration
 */
async function testObjectStorage() {
  try {
    console.log('🧪 Testing Object Storage integration...');
    
    // Test environment detection
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    console.log(`📍 Environment: ${isProduction ? 'production' : 'development'}`);
    
    // Test list functionality
    console.log('📂 Testing list functionality...');
    const listResult = await objectStorage.listImages(undefined, 5);
    console.log(`📊 Found ${listResult.images.length} images in Object Storage`);
    
    if (listResult.images.length > 0) {
      console.log('📋 Sample image paths:', 
        listResult.images.slice(0, 3).map(img => img.path));
    }
    
    console.log('✅ Object Storage test completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Object Storage test failed:', error);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testObjectStorage().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testObjectStorage };