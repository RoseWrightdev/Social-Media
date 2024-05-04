import RegisterForm from "@/components/auth/register-form"

export default function Home(){
  return (
    <>
      <div className="flex">
        {/* left desktop only */}
        <div className="bg-slate-950 w-[50dvw] h-[100dvh] hidden md:flex">

        </div>
        {/* right */}
        <div className="flex flex-col items-center justify-center w-[100dvw] md:w-[50dvw] h-[100dvh] ">
          <button className="absolute top-6 right-6">Login</button>
          <h1 className="font-black text-3xl">Create an account</h1>
          <h3 className="text-balance text-center px-4">Enter your email below to create your account</h3>
          <br/>
          <RegisterForm />
        </div>
        {/* sign-up */}
      </div>
    </>
  )
}