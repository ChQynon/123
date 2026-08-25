'use client'

import React, { useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Desktop, Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'

const THEME_TRANSITION_MS = 480

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
    // at least it works
  }

  const changeTheme = (next: string) => {
    const root = document.documentElement
    root.classList.add('theme-switching')
    setTheme(next)
    window.setTimeout(
      () => root.classList.remove('theme-switching'),
      THEME_TRANSITION_MS,
    )
  }

  return (
    <Tabs defaultValue={theme} onValueChange={changeTheme}>
      <TabsList>
        <TabsTrigger value="light">
          <Sun size={20} />
        </TabsTrigger>
        <TabsTrigger value="dark">
          <Moon size={20} />
        </TabsTrigger>
        <TabsTrigger value="system">
          <Desktop size={20} />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default ThemeSwitcher
