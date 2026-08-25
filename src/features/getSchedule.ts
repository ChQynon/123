import proxy from '@/shared/http'
import { GET_SCHEDULE } from '@/shared/constants/endpoints'
import { CityFullName } from '@/shared/constants/cities'
import { decode } from '@/lib/token/jwt'
import { Schedule, Userinfo } from '@/shared/types'
import { v4 } from 'uuid'

export const getSchedule = async (
  token: string,
  city: CityFullName,
  date?: string,
): Promise<Schedule> => {
  const { UserInfo: stringifiedUserInfo } = await decode<{
    UserInfo: string
  }>(token)
  const { PersonGid: studentId } = JSON.parse(
    stringifiedUserInfo,
  ) as Userinfo

  return await proxy
    .request<Schedule>({
      method: 'POST',
      url: GET_SCHEDULE(city),
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        action: 'v1/Schedule/GetMySchedule',
        operationId: v4(),
        studentId,
        ...(date ? { date } : {}),
      },
    })
    .then((res) => res.data)
}
