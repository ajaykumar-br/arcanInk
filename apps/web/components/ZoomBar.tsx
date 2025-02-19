import React from 'react'
import { IconsButton } from './IconsButton'
import { MinusIcon, PlusIcon } from 'lucide-react'

const ZoomBar = () => {
  return (
    <div className="fixed right-10 bottom-10 z-10 flex rounded-md bg-gray-900 py-2 h-10">
        <div className="text-gray-500 text-2xl flex justify-center items-center cursor-pointer border-r-2 border-slate-700">
          {/* TODO: Implement zoom in and zoom out functionality */}
            <IconsButton icon = {<PlusIcon className='w-3' />} onClick={() => {}} activated={false} />
        </div>

        <div className="text-gray-500 text-2xl flex justify-center items-center cursor-pointer">
            <IconsButton icon = {<MinusIcon className='w-3' />} onClick={() => {}} activated={false} />
        </div>
    </div>
  );
}

export default ZoomBar