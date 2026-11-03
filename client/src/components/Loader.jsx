import { VideoIcon } from 'lucide-react'

const Loader = ({text = "Loading..."}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#080B14] text-[#F4F6FB] z-50">
      <div className="relative flex items-center justify-center">
        <div className='w-16 h-16 rounded-full border-4 border-primary-light border-t-primary animate-spin'/>
         <VideoIcon className="w-6 h-6 text-primary absolute" />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#AAB4CF] animate-pulse">{text}</p>
    </div>
  )
}

export default Loader