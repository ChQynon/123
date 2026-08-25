import React from 'react'
import {
  CalendarDots,
  Calculator,
  DeviceTabletSpeaker,
  GearFine,
  House,
} from '@phosphor-icons/react/dist/ssr'
import NavLink from '@/widgets/navbar/NavLink'

const NavBar = () => {
  return (
    <nav className="fixed bottom-14 left-1/2 z-20 flex h-16 w-[45%] min-w-48 max-w-96 -translate-x-1/2 transform select-none flex-row justify-center rounded-xl border border-content/15 bg-background/70 p-2 shadow-lg backdrop-blur-md sm:h-20 sm:w-80 sm:p-4">
      <NavLink
        href={'/dash'}
        icon={<House size={22} />}
        text="Главная"
      />
      <NavLink
        href={'/calculator'}
        icon={<Calculator size={22} />}
        text="Калькулятор"
      />
      <NavLink
        href={'/reports'}
        icon={<DeviceTabletSpeaker size={22} />}
        text="Табель"
      />
      <NavLink
        href={'/schedule'}
        icon={<CalendarDots size={22} />}
        text="Расписание"
      />
      <NavLink
        href={'/settings'}
        icon={<GearFine size={22} />}
        text="Настройки"
      />
    </nav>
  )
}

export default NavBar
