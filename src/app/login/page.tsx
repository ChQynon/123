import React from 'react'
import AuthForm from '@/widgets/login/AuthForm'
import Logo from '@/components/misc/Logo'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const Page = () => {
  const accessToken = cookies().get('Access')

  // Уже авторизованных пользователей сразу возвращаем в приложение,
  // чтобы они не видели форму входа («вылетел из аккаунта»)
  if (accessToken?.value) {
    redirect('/dash')
  }

  return (
    <div className="approval-toast items-left mx-auto flex h-screen max-w-md flex-col justify-center p-6 text-left">
      <Logo width={46} height={46} className="mb-3 ml-px" />
      <h1 className="w-full scroll-m-20 font-mono text-left text-3xl font-semibold uppercase tracking-[0.04em] leading-none first:mt-0">
        Вход
      </h1>

      <p className="w-full text-left text-base leading-7 text-muted-foreground mt-1 mb-2">
        Используйте свой аккаунт СУШ
      </p>

      <AuthForm />
    </div>
  )
}

export default Page
