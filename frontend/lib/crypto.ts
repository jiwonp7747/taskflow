/**
 * Crypto Utility for Token Encryption
 *
 * AES-256-GCM 암호화를 사용하여 GitHub PAT 토큰을 안전하게 저장
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get or generate encryption key
 * Uses environment variable or generates machine-specific key
 */
function getEncryptionKey(): Buffer {
  // 환경 변수에서 키 가져오기
  const envKey = process.env.TASKFLOW_ENCRYPTION_KEY;
  if (envKey) {
    return crypto.scryptSync(envKey, 'taskflow-salt', 32);
  }

  // 머신 고유 키 생성 (hostname + user 기반)
  const os = require('os');
  const machineId = `${os.hostname()}-${os.userInfo().username}-taskflow`;
  return crypto.scryptSync(machineId, 'taskflow-machine-salt', 32);
}

/**
 * Encrypt a string value
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded encrypted string (salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:ciphertext (all base64)
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypt an encrypted string
 * @param encryptedText - Base64 encoded encrypted string
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  const parts = encryptedText.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted text format');
  }

  const [saltB64, ivB64, authTagB64, ciphertext] = parts;

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(':');
  return parts.length === 4 && parts.every(part => {
    try {
      Buffer.from(part, 'base64');
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Safely encrypt only if not already encrypted
 */
export function ensureEncrypted(text: string): string {
  if (isEncrypted(text)) {
    return text;
  }
  return encrypt(text);
}

/**
 * Safely decrypt only if encrypted
 */
export function ensureDecrypted(text: string): string {
  if (!isEncrypted(text)) {
    return text;
  }
  return decrypt(text);
}
