import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  const keyString = process.env.ENCRYPTION_KEY;
  if (!keyString) throw new Error('ENCRYPTION_KEY is not set in environment variables');
  
  const key = Buffer.from(keyString, 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string using AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  const keyString = process.env.ENCRYPTION_KEY;
  if (!keyString) throw new Error('ENCRYPTION_KEY is not set in environment variables');
  
  const key = Buffer.from(keyString, 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');

  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted text format');

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
