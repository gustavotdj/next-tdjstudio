import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from 'lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { normalizePath } from 'lib/utils';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  // Protect the route - only authenticated users can upload
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { filename, contentType, folder } = await request.json();
    
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    // Create a unique filename to prevent collisions and ensure clean names
    // Remove special chars from original filename but keep extension
    const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '');
    const uniqueFilename = `${Date.now()}-${cleanName}`;
    
    // Construct Key with folder path if provided
    // Sanitize folder path to avoid directory traversal or invalid chars
    let key = uniqueFilename;
    if (folder) {
        const cleanFolder = normalizePath(folder);
        
        // Ensure no leading/trailing slashes
        const normalizedFolder = cleanFolder.replace(/^\/+|\/+$/g, '');
        if (normalizedFolder) {
            key = `${normalizedFolder}/${uniqueFilename}`;
        }
    }

    // Generate Presigned URL
    let client;
    try {
      client = getR2Client();
    } catch (err) {
      console.error('R2 Client Error:', err.message);
      return NextResponse.json({ error: `Storage Configuration Error: ${err.message}` }, { status: 500 });
    }

    if (!R2_BUCKET_NAME) {
      console.error('R2_BUCKET_NAME is not defined');
      return NextResponse.json({ error: 'Storage Configuration Error: Bucket name missing' }, { status: 500 });
    }

    const signedUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 3600 } // URL valid for 1 hour
    );

    return NextResponse.json({
      url: signedUrl,
      filename: uniqueFilename,
      publicUrl: `${R2_PUBLIC_URL || ''}/${key}`
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: `Upload Error: ${error.message}` }, { status: 500 });
  }
}
