import { Logo, ProfilePicture, Settings } from "@/components/dashboard/icons"
import Logout from "@/components/auth/logoutButton"

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="flex flex-row h-[100dvh]">
      <div className="flex flex-col w-[25dvw] items-end p-2 pt-12">
        <Logo/>
          <span className="mt-6 mb-6">
            <ProfilePicture />
          </span>
          <Settings/>
          <div className="absolute bottom-2">
            <Logout/> 
          </div>
      </div>
      <div className="w-[50dvw] pt-12">{children}</div>
      <div className="flex flex-col w-[25dvw] pt-12">
      </div>
    </div>
  )
}