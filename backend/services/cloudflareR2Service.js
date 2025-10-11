const AWS = require('aws-sdk');

/**
 * Cloudflare R2 Storage Service
 * This service handles file uploads to Cloudflare R2 storage
 */
class CloudflareR2Service {
  constructor() {
    // Store endpoint and credentials for validation
    this.endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    this.accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'portal-vanguardia-files';

    // Configure AWS SDK for Cloudflare R2
    this.s3 = new AWS.S3({
      endpoint: this.endpoint, // e.g., 'https://accountid.r2.cloudflarestorage.com'
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      region: 'auto', // Cloudflare R2 uses 'auto' as region
      signatureVersion: 'v4',
    });
  }

  /**
   * Upload a file to Cloudflare R2
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} mimeType - File MIME type
   * @param {string} folder - Folder prefix (e.g., 'planifications')
   * @returns {Promise<Object>} Upload result with file URL
   */
  async uploadFile(fileBuffer, fileName, mimeType, folder = 'uploads') {
    try {
      // Check if we're in development mode or have invalid credentials
      const isDevMode = (process.env.NODE_ENV === 'development' && process.env.FORCE_CLOUDFLARE_R2 !== 'true') ||
                       !this.accessKeyId ||
                       !this.secretAccessKey ||
                       !this.endpoint ||
                       this.accessKeyId.includes('placeholder') ||
                       this.endpoint.includes('your_account_id') ||
                       this.accessKeyId === 'your_access_key';

      console.log('Upload file debug:', {
        NODE_ENV: process.env.NODE_ENV,
        FORCE_CLOUDFLARE_R2: process.env.FORCE_CLOUDFLARE_R2,
        hasAccessKey: !!this.accessKeyId,
        hasSecretKey: !!this.secretAccessKey,
        hasEndpoint: !!this.endpoint,
        endpoint: this.endpoint,
        isDevMode: isDevMode
      });

      if (isDevMode) {
        console.log('Using development mode: storing files locally');
        // Development mode: store files locally
        return await this.uploadFileLocally(fileBuffer, fileName, mimeType, folder);
      }

      console.log('Using production mode: uploading to Cloudflare R2');
      // Generate unique file name with timestamp
      const timestamp = Date.now();
      const _fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${folder}/${timestamp}-${fileName}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: uniqueFileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ContentDisposition: `inline; filename="${fileName}"`,
        // Make file publicly accessible
        ACL: 'public-read',
        // Optional: Add metadata
        Metadata: {
          'original-name': fileName,
          'upload-timestamp': timestamp.toString(),
          'folder': folder
        }
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        fileUrl: result.Location,
        fileName: uniqueFileName,
        originalName: fileName,
        size: fileBuffer.length,
        mimeType: mimeType,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading file to Cloudflare R2:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload file locally for development
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} mimeType - MIME type
   * @param {string} folder - Folder name
   * @returns {Promise<Object>} Upload result
   */
  async uploadFileLocally(fileBuffer, fileName, mimeType, folder = 'uploads') {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads', folder);
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique file name with timestamp
      const timestamp = Date.now();
      const _fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${timestamp}-${fileName}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      // Save file locally
      await fs.writeFile(filePath, fileBuffer);

      console.log(`File saved locally in development mode: ${filePath}`);

      return {
        success: true,
        fileUrl: `/uploads/${folder}/${uniqueFileName}`, // Relative URL for development
        fileName: `${folder}/${uniqueFileName}`,
        originalName: fileName,
        size: fileBuffer.length,
        mimeType: mimeType,
        uploadedAt: new Date().toISOString(),
        localPath: filePath,
        isDevelopment: true
      };
    } catch (error) {
      console.error('Error saving file locally:', error);
      throw new Error(`Local file save failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from Cloudflare R2
   * @param {string} fileName - File name/key to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(fileName) {
    try {
      // Check if we're in development mode
      const isDevMode = (process.env.NODE_ENV === 'development' && process.env.FORCE_CLOUDFLARE_R2 !== 'true') ||
                       !this.accessKeyId ||
                       !this.secretAccessKey ||
                       !this.endpoint;

      if (isDevMode) {
        console.log('Development mode: attempting to delete local file');
        return await this.deleteFileLocally(fileName);
      }

      console.log('Production mode: deleting from Cloudflare R2');
      const deleteParams = {
        Bucket: this.bucketName,
        Key: fileName
      };

      await this.s3.deleteObject(deleteParams).promise();

      return {
        success: true,
        message: 'File deleted successfully',
        fileName: fileName
      };
    } catch (error) {
      console.error('Error deleting file from Cloudflare R2:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete file locally for development
   * @param {string} fileName - File name to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFileLocally(fileName) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Extract the actual filename from the path
      const actualFileName = fileName.includes('/') ? fileName.split('/').pop() : fileName;
      const filePath = path.join(__dirname, '..', 'uploads', 'profile-images', actualFileName);

      // Check if file exists
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`Local file deleted: ${filePath}`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`File not found (already deleted?): ${filePath}`);
        } else {
          throw error;
        }
      }

      return {
        success: true,
        message: 'File deleted successfully (local)',
        fileName: fileName,
        isDevelopment: true
      };
    } catch (error) {
      console.error('Error deleting local file:', error);
      throw new Error(`Local file deletion failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   * @param {string} fileName - File name/key
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileName) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: fileName
      };

      const result = await this.s3.headObject(params).promise();

      return {
        success: true,
        fileName: fileName,
        size: result.ContentLength,
        mimeType: result.ContentType,
        lastModified: result.LastModified,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for temporary file access
   * @param {string} fileName - File name/key
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUrl(fileName, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: fileName,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Validate file type for planification uploads
   * @param {string} mimeType - File MIME type
   * @param {string} fileName - File name
   * @returns {boolean} Whether file type is valid
   */
  isValidPlanificationFile(mimeType, fileName) {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    return allowedMimeTypes.includes(mimeType) && allowedExtensions.includes(fileExtension);
  }

  /**
   * Get file size limit in bytes (10MB for planification files)
   * @returns {number} Size limit in bytes
   */
  getFileSizeLimit() {
    return 10 * 1024 * 1024; // 10MB
  }
}

module.exports = new CloudflareR2Service();
