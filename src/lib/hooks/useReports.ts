import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/http'
import { ReportCard } from '@/shared/types'

export const useReports = () => {
  return useQuery<ReportCard>({
    queryKey: ['reports'],
    queryFn: async ({ signal }) =>
      await http
        .get<ReportCard>('/api/reports', { signal })
        .then((res) => res.data),
    staleTime: 60000,
    refetchInterval: 120000,
  })
}
