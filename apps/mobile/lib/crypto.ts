import * as Crypto from 'expo-crypto'

/**
 * Криптография ПИН-кода: SHA-256 хэш + случайная соль.
 * ПИН никогда не хранится в открытом виде.
 */

/** Генерирует случайную соль (hex, 32 символа) */
export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Хэширует ПИН с солью через SHA-256 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  )
}

/** Проверяет ПИН против сохранённого хэша */
export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const hash = await hashPin(pin, salt)
  return hash === expectedHash
}
