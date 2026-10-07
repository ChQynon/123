import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/http'
import { Journal } from '@/shared/types'

export const useJournal = () => {
  return useQuery<Journal>({
    queryKey: ['journal'],
    queryFn: async ({ signal }) =>
      await http
        .get<Journal>('/api/journal', { signal })
        .then((res) => res.data),
    staleTime: 60000,
    refetchInterval: 120000,
  })
}
