'use client'

import React, { FC } from 'react'

export interface NumpadProps {
  onKey: (key: string) => void
}

const KEYS: string[][] = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  [',', '0', '⌫'],
]

export const Numpad: FC<NumpadProps> = ({ onKey }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.flat().map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          className="h-14 select-none rounded-xl bg-content/10 font-mono text-xl text-content transition-all duration-150 ease-smooth-out hover:bg-content/20 active:scale-95"
        >
          {key}
        </button>
      ))}
    </div>
  )
}

export default Numpad
