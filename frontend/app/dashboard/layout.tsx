export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="flex flex-row h-[100dvh]">
      <div className="flex flex-col w-[25dvw] border-2 ">
        Profile, Logout, Settings
      </div>
      <div className="w-[50dvw] border-2 border-red-600">{children}</div>
      <div className="flex flex-col w-[25dvw] border-2">
        Trending, recomended posts
      </div>
    </div>
  )
}