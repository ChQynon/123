import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/http'
import { RubricInfo } from '@/shared/types'

export const useRubric = (subject: string, quarter: number, enabled = true) => {
  return useQuery<RubricInfo>({
    enabled: enabled && Boolean(subject),
    queryKey: ['rubric', subject, quarter],
    queryFn: async ({ signal }) => {
      return await http
        .get<RubricInfo>(`/api/journal/${subject}?quarter=${quarter}`, {
          signal,
        })
        .then((res) => res.data)
    },
    staleTime: 60000,
    refetchInterval: false,
  })
}

export default useRubric
