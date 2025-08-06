import { objectStorage } from './objectStorage';
import sharp from 'sharp';

/**
 * Test a complete upload and download cycle
 */
async function testUploadCycle() {
  try {
    console.log('🧪 Testing complete upload cycle...');
    
    // Create a test image buffer
    const testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 1 }
      }
    }).png().toBuffer();
    
    console.log(`📦 Created test image buffer: ${testImageBuffer.length} bytes`);
    
    // Test upload
    console.log('📤 Testing upload...');
    const uploadResult = await objectStorage.uploadImage(testImageBuffer, 'test-integration-image', 'png');
    console.log('✅ Upload result:', uploadResult);
    
    // Test list to see if file appears
    console.log('📋 Testing list after upload...');
    const listResult = await objectStorage.listImages();
    console.log(`📊 Found ${listResult.images.length} images after upload`);
    
    if (listResult.images.length > 0) {
      console.log('🎯 Sample images:', listResult.images.slice(0, 3));
      
      // Test download
      const firstImage = listResult.images[0];
      console.log(`⬇️ Testing download of: ${firstImage.path}`);
      
      const downloadedBuffer = await objectStorage.downloadImage(firstImage.path);
      console.log(`✅ Downloaded ${downloadedBuffer.length} bytes`);
    }
    
    console.log('🎉 Complete upload cycle test successful!');
    return true;
  } catch (error) {
    console.error('❌ Upload cycle test failed:', error);
    return false;
  }
}

testUploadCycle();