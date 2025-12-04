/**
 * Asset types for storage classification
 * Determines if asset should be public or private
 */
export enum AssetType {
  /**
   * Product images (catalog)
   * - Public: Yes
   * - CDN: Yes
   * - Cache: Aggressive (immutable)
   */
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',

  /**
   * Category images
   * - Public: Yes
   * - CDN: Yes
   * - Cache: Aggressive
   */
  CATEGORY_IMAGE = 'CATEGORY_IMAGE',

  /**
   * User avatars
   * - Public: No
   * - Access: Presigned URLs only
   * - Expiration: 1 hour
   */
  AVATAR = 'AVATAR',

  /**
   * KYC documents (future use)
   * - Public: No
   * - Access: Presigned URLs only
   * - Expiration: 1 hour
   */
  KYC_DOCUMENT = 'KYC_DOCUMENT',
}

/**
 * Determine if an asset type should be public
 */
export function isPublicAsset(type: AssetType): boolean {
  return [
    AssetType.PRODUCT_IMAGE,
    AssetType.CATEGORY_IMAGE,
  ].includes(type);
}

/**
 * Get recommended expiration time for presigned URLs (in seconds)
 */
export function getPresignedUrlExpiration(type: AssetType): number {
  switch (type) {
    case AssetType.AVATAR:
      return 60 * 60; // 1 hour
    case AssetType.KYC_DOCUMENT:
      return 60 * 60; // 1 hour
    default:
      return 60 * 60; // 1 hour default
  }
}
