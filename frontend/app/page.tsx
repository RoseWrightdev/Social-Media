
export default function Home(){
  return (
    <>
      <div className="flex">
        {/* left desktop only */}
        <div className="bg-slate-950 w-[50dvw] h-[100dvh] hidden md:flex">

        </div>
        {/* right */}
        <div className="flex flex-col w-[100dvw] md:w-[50dvw]">
          <button className="place-self-end p-6 border-2">Login</button>
          <div className="flex-col items-center justify-center text-center">
            <div>
              <h1 className="font-black text-3xl">Create an account</h1>
              <h3>Enter your email below to create your account</h3>
            </div>
          </div>
        </div>
        {/* sign-up */}
        
      </div>
    </>
  )
}