'use client'

import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
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
    /*
      Ошибки 4xx — это «расписание не опубликовано» или «нет доступа к
      данным»: повтор запроса ничего не изменит, только покажет лишние
      запросы. Повторяем лишь сбои сервиса (5xx, сеть).
    */
    retry: (failureCount, error) => {
      if (isAxiosError(error)) {
        const status = error.response?.status ?? 0

        if (status >= 400 && status < 500) return false
      }

      return failureCount < 2
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: false,
  })
}

export default useSchedule
