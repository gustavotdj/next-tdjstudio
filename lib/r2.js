import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function listR2Objects(prefix = '', recursive = false) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      Delimiter: recursive ? undefined : '/',
    });

    const response = await r2.send(command);
    
    // Process files (Contents)
    const files = (response.Contents || []).map(item => ({
      name: item.Key.replace(prefix, ''), // Remove prefix for display name
      key: item.Key,
      path: item.Key, // Add path property for FileManager
      size: item.Size,
      lastModified: item.LastModified,
      url: `${R2_PUBLIC_URL}/${item.Key}`,
      type: 'file'
    })).filter(f => f.name !== ''); // Filter out the directory placeholder itself if it exists

    // Process folders (CommonPrefixes)
    const folders = (response.CommonPrefixes || []).map(item => ({
      name: item.Prefix.replace(prefix, '').replace(/\/$/, ''), // Remove prefix and trailing slash
      key: item.Prefix,
      path: item.Prefix, // Add path property for FileManager
      type: 'folder'
    }));

    return { folders, files };
  } catch (error) {
    console.error('Error listing R2 objects:', error);
    return { folders: [], files: [] };
  }
}
