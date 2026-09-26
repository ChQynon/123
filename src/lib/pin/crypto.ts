/**
 * Криптография ПИН-кода: SHA-256 хэш + случайная соль.
 * ПИН никогда не хранится в открытом виде.
 */

/** Генерирует случайную соль (hex, 32 символа) */
export function generateSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Хэширует ПИН с солью через SHA-256 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${salt}:${pin}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('')
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
