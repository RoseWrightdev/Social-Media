import { Logo, ProfilePicture, Settings } from "@/components/dashboard/icons"
import { TrendingSkeleton } from "@/components/skeleton/skeletons"


export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="flex flex-row h-[100dvh]">
      <div className="flex flex-col w-[25dvw] items-end p-2">
        <Logo/>
          <span className="mt-6 mb-6">
            <ProfilePicture/>
          </span>
          <Settings/>
      </div>
      <div className="w-[50dvw] ">{children}</div>
      <div className="flex flex-col w-[25dvw]">
        <TrendingSkeleton />
      </div>
    </div>
  )
}