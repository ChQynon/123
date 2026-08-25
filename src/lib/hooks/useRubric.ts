import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/http'
import { RubricInfo } from '@/shared/types'

export const useRubric = (
  subject: string,
  quarter: number,
  enabled = true,
) => {
  return useQuery<RubricInfo>({
    enabled: enabled && Boolean(subject),
    queryKey: ['rubric', subject, quarter],
    queryFn: async () => {
      return await http
        .get<RubricInfo>(`/api/journal/${subject}?quarter=${quarter}`)
        .then((res) => res.data)
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  })
}

export default useRubric
