import React from 'react'
import TerminalSpinner from '@/components/misc/TerminalSpinner'

const ReportsLoading = () => {
  return (
    <div className="h-[43.5rem] w-full">
      <div className="relative top-1/2 mx-auto h-fit w-fit -translate-y-1/2 transform">
        <TerminalSpinner className="text-2xl leading-none text-content/50" />
      </div>
    </div>
  )
}

export default ReportsLoading
