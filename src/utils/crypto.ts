/**
 * Cryptographic helpers for password hashing using Web Crypto SHA-256 with salt
 */

export async function hashPassword(password: string, salt: string = 'yatta_supervisor_salt_2026'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPassword(password: string, storedHash: string, salt: string = 'yatta_supervisor_salt_2026'): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}
