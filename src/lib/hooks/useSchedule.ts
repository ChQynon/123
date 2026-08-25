'use client'

import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/http'
import { Schedule } from '@/shared/types'

export const useSchedule = (date?: string) => {
  return useQuery<Schedule>({
    queryKey: ['schedule', date ?? null],
    queryFn: async () =>
      await http
        .get<Schedule>('/api/schedule', {
          params: date ? { date } : {},
        })
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchInterval: false,
  })
}

export default useSchedule
