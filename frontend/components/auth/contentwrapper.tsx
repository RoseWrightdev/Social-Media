export default function ContentWrapper({children}: {children: React.ReactNode}) {
  return (
    <>
      <div className="flex">
        {/* left desktop only */}
        <div className="bg-slate-950 w-[50dvw] h-[100dvh] hidden md:flex">
        </div>
        {/* right mobile & desktop */}
        <div className="flex flex-col items-center justify-center w-[100dvw] md:w-[50dvw] h-[100dvh] ">
          {children}
        </div>
      </div>
    </>
  )
}