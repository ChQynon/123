import NavBar from '@/widgets/navbar/NavBar'
import React, { FC, PropsWithChildren } from 'react'
import Header from '@/widgets/header/Header'
import Logo from '@/components/misc/Logo'
import { Button } from '@/components/ui/button'
import { TelegramLogo } from '@phosphor-icons/react/dist/ssr'
import PinGate from '@/widgets/pin/PinGate'

const DEVELOPER_LINK = 'https://t.me/academia_nis'

const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <PinGate>
      <div className="page-enter mx-auto flex w-[92.5%] flex-col justify-center sm:max-w-[47rem]">
        <div className="mb-8 flex w-full flex-col">
          <Header />

          {children}
        </div>
      </div>

      {/* NavBar — вне анимируемого контейнера: transform на предке
          ломает position: fixed у панели навигации */}
      <NavBar />
      <footer className="mx-auto mb-3 mt-10 flex w-[92.5%] flex-row items-center justify-between sm:mt-auto sm:max-w-[47rem] sm:flex-row">
        <div className="flex w-fit flex-row items-center pl-2 text-muted-foreground sm:mx-0">
          <Logo width={19} height={19} className="my-0" />
          <p className="m-0 px-1 font-mono text-xl leading-none tracking-[0.04em]">
            adaption
          </p>
        </div>
        <div className="flex flex-row items-center justify-center gap-1 text-center">
          <a
            href={DEVELOPER_LINK}
            target="_blank"
            rel="noopener"
            className="transition-opacity hover:opacity-70"
          >
            <Button variant="link" className="mx-1 p-1 px-2">
              <TelegramLogo size={24} className="mx-1" />
              <span className="hidden sm:flex">Разработчик</span>
            </Button>
          </a>
        </div>
      </footer>
    </PinGate>
  )
}

export default Layout
