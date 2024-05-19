import UpdatePasswordForm from '@/components/auth/updatePasswordForm'

export default function Page({params}: {params: {token: string}}) {
  //fix unsantized user input
  const token = params.token
  
  return (
    <>
    <div className="flex">
      {/* left desktop only */}
      <div className="bg-slate-950 w-[50dvw] h-[100dvh] hidden md:flex">
      </div>
      {/* right */}
      <div className="flex flex-col items-center justify-center w-[100dvw] md:w-[50dvw] h-[100dvh] ">
        <h1 className="font-black text-3xl">Update your password</h1>
        <h3 className="text-balance text-center px-4">Enter and confirm your password below</h3>
        <br/>
        <UpdatePasswordForm token={token}/>
      </div>
      {/* sign-up */}
    </div>
  </>
  )
}