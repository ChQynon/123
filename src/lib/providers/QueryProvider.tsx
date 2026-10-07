'use client'

import React, { type FC, type PropsWithChildren, useState } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { IDBQueryPersistor } from '@/lib/utils'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useRouter } from 'next-nprogress-bar'

const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
            staleTime: 60000,
            gcTime: 1000 * 60 * 60 * 24,
            refetchInterval: false,
            throwOnError: (error) => {
              if (error.message === 'UNAUTHORIZED') {
                queryClient.removeQueries()
                router.push('/login')
              }

              return false
            },
          },
        },
      }),
  )

  const [persister] = useState(() => IDBQueryPersistor())

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}

export default QueryProvider
