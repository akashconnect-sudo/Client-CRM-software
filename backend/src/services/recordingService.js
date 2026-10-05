import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

let s3Client;

function getS3() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.awsRegion || 'ap-south-1',
    });
  }
  return s3Client;
}

/**
 * Presigned GET for a private recording object.
 * Key must already be validated and read from DB — never from the client.
 */
export async function createRecordingPresignedUrl(recordingKey, expiresIn = 300) {
  if (!env.recordingsBucket) {
    throw Object.assign(new Error('RECORDINGS_BUCKET is not configured'), { statusCode: 503 });
  }
  if (!recordingKey) {
    throw Object.assign(new Error('Recording not available yet'), { statusCode: 404 });
  }

  const command = new GetObjectCommand({
    Bucket: env.recordingsBucket,
    Key: recordingKey,
  });

  const url = await getSignedUrl(getS3(), command, { expiresIn });
  return { url, expiresIn };
}
