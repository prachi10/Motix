/**
 * MOTIX Cryptographic Security Engine
 * AES-256-GCM + Argon2id / High-Iteration PBKDF2
 * Web Crypto API compliant, local-first zero-knowledge architecture.
 */

import { argon2id } from 'hash-wasm';

const VERIFIER_PLAINTEXT = 'MOTIX_VERIFIED_VAULT_TOKEN_BY_MOTI_TECH_2026';

// Helper: Uint8Array to Hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Helper: ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate cryptographically secure random bytes
export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Derive AES-256-GCM Key from password & salt
 * Uses Argon2id (memory-hard, resistant to GPU/ASIC attacks)
 * With Web Crypto PBKDF2 (600,000 iterations) fallback.
 */
export async function deriveVaultKey(password: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  try {
    // Attempt Argon2id key derivation via hash-wasm
    const derivedBytes = await argon2id({
      password,
      salt: saltBytes,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536, // 64 MB
      hashLength: 32, // 256 bits
      outputType: 'binary',
    });

    return await crypto.subtle.importKey(
      'raw',
      derivedBytes as unknown as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    console.warn('Argon2id fallback to PBKDF2 (600,000 iterations):', err);
    // Bulletproof Web Crypto PBKDF2 fallback
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes as unknown as BufferSource,
        iterations: 600000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

/**
 * Encrypt arbitrary string with AES-256-GCM
 */
export async function encryptText(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = getRandomBytes(12); // Standard 96-bit IV for AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(text)
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bytesToHex(iv),
  };
}

/**
 * Decrypt string with AES-256-GCM
 */
export async function decryptText(ciphertextBase64: string, ivHex: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const iv = hexToBytes(ivHex);
  const buffer = base64ToBuffer(ciphertextBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    buffer
  );

  return dec.decode(decrypted);
}

/**
 * Encrypt binary data (Photos, Videos, PDFs, etc.)
 */
export async function encryptBinary(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; ivHex: string }> {
  const iv = getRandomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data
  );

  return {
    ciphertext,
    ivHex: bytesToHex(iv),
  };
}

/**
 * Decrypt binary data
 */
export async function decryptBinary(
  ciphertext: ArrayBuffer,
  ivHex: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = hexToBytes(ivHex);
  return await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext
  );
}

/**
 * Create a password verification payload
 */
export async function createPasswordVerifier(key: CryptoKey): Promise<string> {
  const { ciphertext, iv } = await encryptText(VERIFIER_PLAINTEXT, key);
  return JSON.stringify({ ciphertext, iv });
}

/**
 * Verify whether a derived key correctly decrypts the verifier
 */
export async function verifyVaultKey(key: CryptoKey, verifierJson: string): Promise<boolean> {
  try {
    const { ciphertext, iv } = JSON.parse(verifierJson);
    const decrypted = await decryptText(ciphertext, iv, key);
    return decrypted === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

/**
 * Generate Secure Recovery Key (32-byte alphanumeric format)
 * Example: "MTX9-4K7B-9P2L-8W1M-3R5X-2Q7Z"
 */
export async function generateRecoveryKey(): Promise<{ rawKey: string; formattedKey: string; hash: string }> {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 avoiding 0, O, 1, I
  const random = getRandomBytes(24);
  let code = '';
  for (let i = 0; i < random.length; i++) {
    code += charset[random[i] % charset.length];
  }

  // Format into 6 blocks of 4 chars prefixed with MTX9
  const formattedKey = `MTX9-${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}-${code.substring(12, 16)}-${code.substring(16, 20)}`;
  const rawKey = formattedKey.replace(/-/g, '').toUpperCase();

  // Compute SHA-256 hash for storage
  const hash = await calculateSha256(rawKey);

  return { rawKey, formattedKey, hash };
}

/**
 * Verify recovery key input
 */
export async function verifyRecoveryKey(inputKey: string, storedHash: string): Promise<boolean> {
  const cleaned = inputKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const inputHash = await calculateSha256(cleaned);
  return inputHash === storedHash;
}

/**
 * SHA-256 Checksum computation
 */
export async function calculateSha256(data: string | ArrayBuffer): Promise<string> {
  let buffer: BufferSource;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data) as unknown as BufferSource;
  } else {
    buffer = data as unknown as BufferSource;
  }
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Generate Cryptographically Strong Password
 */
export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeLookalikes: boolean; // 0, O, 1, l, I
}

export function generatePassword(options: PasswordGeneratorOptions): string {
  let lower = 'abcdefghijklmnopqrstuvwxyz';
  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let numbers = '0123456789';
  let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.excludeLookalikes) {
    lower = lower.replace(/[lo]/g, '');
    upper = upper.replace(/[IO]/g, '');
    numbers = numbers.replace(/[01]/g, '');
  }

  let charset = '';
  const mandatoryChars: string[] = [];

  if (options.includeLowercase && lower.length) {
    charset += lower;
    mandatoryChars.push(lower[getRandomBytes(1)[0] % lower.length]);
  }
  if (options.includeUppercase && upper.length) {
    charset += upper;
    mandatoryChars.push(upper[getRandomBytes(1)[0] % upper.length]);
  }
  if (options.includeNumbers && numbers.length) {
    charset += numbers;
    mandatoryChars.push(numbers[getRandomBytes(1)[0] % numbers.length]);
  }
  if (options.includeSymbols && symbols.length) {
    charset += symbols;
    mandatoryChars.push(symbols[getRandomBytes(1)[0] % symbols.length]);
  }

  if (charset.length === 0) {
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }

  const resultChars: string[] = [...mandatoryChars];
  const remaining = Math.max(0, options.length - mandatoryChars.length);
  const randomBytes = getRandomBytes(remaining);

  for (let i = 0; i < remaining; i++) {
    resultChars.push(charset[randomBytes[i] % charset.length]);
  }

  // Fisher-Yates shuffle with crypto randomness
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = getRandomBytes(1)[0] % (i + 1);
    const temp = resultChars[i];
    resultChars[i] = resultChars[j];
    resultChars[j] = temp;
  }

  return resultChars.join('');
}

/**
 * Evaluate Password Strength & Entropy
 */
export function evaluatePasswordStrength(password: string): {
  score: number; // 0-100
  label: 'Very Weak' | 'Weak' | 'Moderate' | 'Strong' | 'Fortified';
  color: string;
  feedback: string[];
} {
  if (!password) {
    return { score: 0, label: 'Very Weak', color: 'text-red-500', feedback: ['Password cannot be empty'] };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length points
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 15;
  if (password.length >= 20) score += 10;

  // Diversity points
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  // Penalties
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 15;
    feedback.push('Add numbers and symbols');
  }
  if (/^[0-9]+$/.test(password)) {
    score -= 30;
    feedback.push('Only numbers used');
  }
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repetitive characters');
  }

  score = Math.max(0, Math.min(100, score));

  if (score < 30) {
    return { score, label: 'Very Weak', color: 'text-rose-500', feedback };
  } else if (score < 55) {
    return { score, label: 'Weak', color: 'text-amber-500', feedback };
  } else if (score < 75) {
    return { score, label: 'Moderate', color: 'text-yellow-400', feedback };
  } else if (score < 90) {
    return { score, label: 'Strong', color: 'text-blue-400', feedback };
  } else {
    return { score, label: 'Fortified', color: 'text-cyan-400', feedback };
  }
}
