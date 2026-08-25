'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next-nprogress-bar'
import { ArrowLeft } from '@phosphor-icons/react'
import Link from 'next/link'
import TerminalSpinner from '@/components/misc/TerminalSpinner'
import Logo from '@/components/misc/Logo'

const NotFound = () => {
  const router = useRouter()

  return (
    <div className="page-enter mx-auto flex h-screen w-[92.5%] max-w-md flex-col items-center justify-center text-center">
      {/* Сцена: лого бежит и падает */}
      <div className="logo-run-stage mb-2" aria-hidden>
        <div className="logo-runner">
          <Logo width={64} height={64} className="my-0" />
        </div>
      </div>

      <p className="font-mono text-sm uppercase tracking-[0.3em] text-content/40">
        404
      </p>
      <h1 className="mt-2 scroll-m-20 text-3xl font-semibold tracking-tight sm:text-4xl">
        Такой страницы нету
      </h1>
      <p className="mt-2 max-w-72 text-sm leading-6 text-muted-foreground">
        Страница не найдена — возможно, она была удалена или её адрес
        введён неверно.
      </p>

      <div className="mt-6 w-full">
        <Link href="/dash">
          <Button className="my-1 w-full">
            <TerminalSpinner className="mr-1.5" /> На главную
          </Button>
        </Link>
        <Button
          variant="outline"
          className="my-1 w-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1" />
          Назад
        </Button>
      </div>
    </div>
  )
}

export default NotFound
