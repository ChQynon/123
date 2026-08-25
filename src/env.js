import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side variables. On hosting (Vercel и т.п.) они могут быть
   * не заданы — поэтому у всех есть безопасные значения по умолчанию.
   */
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    RUNTIME: z.enum(['edge', 'node']).default('node'),
  },

  /**
   * Client-side переменные. Значения по умолчанию позволяют
   * собираться без настройки Environment Variables в Vercel.
   */
  client: {
    NEXT_PUBLIC_CONTACT_LINK: z
      .string()
      .url()
      .default('https://t.me/academia_nis'),
    NEXT_PUBLIC_REPO_LINK: z
      .string()
      .url()
      .default('https://github.com/ChQynon/123'),
    NEXT_PUBLIC_DONATE_LINK: z
      .string()
      .url()
      .default('https://www.donationalerts.com/r/alyxmp4'),
  },

  /**
   * Нельзя деструктурировать process.env на edge/client — разбираем вручную.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    RUNTIME: process.env.RUNTIME,
    NEXT_PUBLIC_CONTACT_LINK: process.env.NEXT_PUBLIC_CONTACT_LINK,
    NEXT_PUBLIC_REPO_LINK: process.env.NEXT_PUBLIC_REPO_LINK,
    NEXT_PUBLIC_DONATE_LINK: process.env.NEXT_PUBLIC_DONATE_LINK,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
