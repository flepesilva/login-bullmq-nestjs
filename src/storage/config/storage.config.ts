import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,

  // Bucket configuration - supports single or dual bucket setup
  awsS3BucketName: process.env.AWS_S3_BUCKET_NAME, // Legacy/default bucket
  awsS3PublicBucket: process.env.AWS_S3_PUBLIC_BUCKET || process.env.AWS_S3_BUCKET_NAME, // Public assets
  awsS3PrivateBucket: process.env.AWS_S3_PRIVATE_BUCKET || process.env.AWS_S3_BUCKET_NAME, // Private assets

  awsS3Endpoint: process.env.AWS_S3_ENDPOINT,
  awsS3PublicDomain: process.env.AWS_S3_PUBLIC_DOMAIN, // Para Cloudflare R2 custom domain o R2.dev
}));
