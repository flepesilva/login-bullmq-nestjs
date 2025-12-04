import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import storageConfig from './config/storage.config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AssetType,
  isPublicAsset,
  getPresignedUrlExpiration,
} from '../common/enums/asset-type.enum';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private readonly publicBucket: string;
  private readonly privateBucket: string;
  private readonly region: string;
  private readonly isCloudflareR2: boolean;

  constructor(
    @Inject(storageConfig.KEY)
    private config: ConfigType<typeof storageConfig>,
  ) {
    if (
      !this.config.awsS3PublicBucket ||
      !this.config.awsS3PrivateBucket ||  
      !this.config.awsRegion ||
      !this.config.awsAccessKeyId ||
      !this.config.awsSecretAccessKey
    ) {
      throw new Error('Faltan variables de configuración de AWS S3');
    }
    this.publicBucket = this.config.awsS3PublicBucket;
    this.privateBucket = this.config.awsS3PrivateBucket;
    this.region = this.config.awsRegion;
    this.isCloudflareR2 = this.config.awsS3Endpoint?.includes('r2.cloudflarestorage.com') || false;

    // Validar configuración de buckets separados
    if (this.publicBucket === this.privateBucket) {
      this.logger.warn(
        '⚠️  ADVERTENCIA DE SEGURIDAD: Usando el mismo bucket para assets públicos y privados. ' +
        'Se recomienda configurar AWS_S3_PUBLIC_BUCKET y AWS_S3_PRIVATE_BUCKET con buckets separados. ' +
        'Bucket actual: ' + this.publicBucket
      );
    } else {
      this.logger.log(
        `✓ Buckets separados configurados correctamente - Público: ${this.publicBucket}, Privado: ${this.privateBucket}`
      );
    }

    // Inicializar el cliente S3 con AWS SDK v3
    this.s3Client = new S3Client({
      endpoint: this.config.awsS3Endpoint,
      region: this.region,
      credentials: {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey,
      },
    });
  }

  /**
   * Upload file to appropriate bucket based on asset type
   * @param assetType - Type of asset (determines public vs private bucket)
   * @param key - S3 object key (path within bucket)
   * @param buffer - File buffer
   * @param mimetype - MIME type
   * @returns URL (public URL for public assets, S3 key for private assets)
   */
  async uploadFile(
    assetType: AssetType,
    key: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    const isPublic = isPublicAsset(assetType);
    const bucket = isPublic ? this.publicBucket : this.privateBucket;

    const commandParams: any = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    };

    // Add cache control headers for public assets
    if (isPublic) {
      switch (assetType) {
        case AssetType.PRODUCT_IMAGE:
        case AssetType.CATEGORY_IMAGE:
          commandParams.CacheControl = 'public, max-age=31536000, immutable';
          break;
        case AssetType.AVATAR:
          commandParams.CacheControl = 'public, max-age=31536000';
          break;
      }

      // Only add ACL for public assets if NOT using Cloudflare R2
      if (!this.isCloudflareR2) {
        commandParams.ACL = 'public-read';
      }
    }

    const command = new PutObjectCommand(commandParams);
    await this.s3Client.send(command);

    // Return public URL for public assets, key for private assets
    if (isPublic) {
      return this.buildPublicUrl(bucket, key);
    } else {
      // For private assets, return the key (caller will use generatePresignedUrl)
      return key;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use uploadFile with AssetType instead
   */
  async uploadFileLegacy(
    key: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    // Default to PRODUCT_IMAGE for backward compatibility
    return this.uploadFile(AssetType.PRODUCT_IMAGE, key, buffer, mimetype);
  }

  /**
   * Generate presigned URL for private asset access
   * @param key - S3 object key
   * @param assetType - Type of asset (determines expiration)
   * @returns Presigned URL valid for limited time
   */
  async generatePresignedUrl(
    key: string,
    assetType: AssetType,
  ): Promise<string> {
    const bucket = this.privateBucket;
    const expiresIn = getPresignedUrlExpiration(assetType);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    return url;
  }

  /**
   * Generate presigned URL for avatar (convenience method)
   * @param avatarKey - Avatar S3 key
   * @returns Presigned URL valid for 1 hour, or null if no key provided
   */
  async generateAvatarUrl(avatarKey: string | null | undefined): Promise<string | null> {
    if (!avatarKey) {
      return null;
    }
    return this.generatePresignedUrl(avatarKey, AssetType.AVATAR);
  }

  /**
   * Stream a private asset from S3 (for proxy mode)
   * @param key - S3 object key
   * @returns Stream and metadata (contentType, contentLength, lastModified)
   */
  async streamPrivateAsset(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength: number;
    lastModified: Date;
  }> {
    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error('No data received from S3');
    }

    return {
      stream: response.Body as NodeJS.ReadableStream,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
    };
  }

  /**
   * Build public URL for an asset
   * @param bucket - Bucket name
   * @param key - Object key
   * @returns Public URL
   */
  private buildPublicUrl(bucket: string, key: string): string {
    if (this.isCloudflareR2) {
      const publicDomain = this.config.awsS3PublicDomain;
      if (publicDomain) {
        return `${publicDomain}/${key}`;
      } else {
        return `https://${bucket}.r2.dev/${key}`;
      }
    } else {
      // AWS S3 standard
      return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
  }
}
