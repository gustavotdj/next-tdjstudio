import { getR2Client, R2_BUCKET_NAME } from 'lib/r2';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  
  // Protect the route
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'Missing file URL' }, { status: 400 });
    }

    // Extract key from URL
    // URL format: https://[pub-domain]/[key]
    // We need to support both full URLs and just keys if sent that way
    let key = url;
    if (url.startsWith('http')) {
        const urlObj = new URL(url);
        // Remove leading slash
        key = urlObj.pathname.substring(1);
    }
    
    // Decode URI component in case of spaces or special chars
    key = decodeURIComponent(key);

    console.log(`Deleting file from R2. Key: ${key}`);

    const client = getR2Client();
    await client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
