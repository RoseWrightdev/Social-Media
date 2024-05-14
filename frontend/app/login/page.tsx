import LoginForm from "@/components/auth/loginForm";
import Link from 'next/link'

export default function login(){
  return (
    <>
      <div className="flex">
        {/* left desktop only */}
        <div className="bg-slate-950 w-[50dvw] h-[100dvh] hidden md:flex">
        </div>
        {/* right */}
        <div className="flex flex-col items-center justify-center w-[100dvw] md:w-[50dvw] h-[100dvh] ">
          <Link href={"/"} className="absolute top-6 right-6">Sign up</Link>
          <h1 className="font-black text-3xl">Login to your account</h1>
          <h3 className="text-balance text-center px-4">Enter your email and password below</h3>
          <br/>
          <LoginForm/>
        </div>
        {/* sign-up */}
      </div>
    </>
  )
}

