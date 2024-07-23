import { Logo, ProfilePicture, Settings } from "@/components/dashboard/icons"

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <>
      <div className="flex flex-row">
        <div className="flex flex-col w-[25dvw] items-end p-2 pt-12 min-h-96">
          <div className="sticky top-12">
            <Logo/>
          </div>
          <div className="sticky top-32">
            <ProfilePicture />
          </div>
          <div className="sticky top-52">
            <Settings/>
          </div>
        </div>
          <div className="w-[50dvw] pt-12 mx-8">{children}</div>
          <div className="flex flex-col w-[25dvw] pt-12">
        </div>
      </div>
    </>
  )
}