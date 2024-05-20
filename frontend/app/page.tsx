import RegisterForm from "@/components/auth/registerForm"
import Link from 'next/link'
import ContentWrapper from "@/components/auth/contentwrapper"

export default function Home(){
  return (
    <>
      <ContentWrapper>
        <Link href={"/login"} className="absolute top-6 right-6">Login</Link>
        <h1 className="font-black text-3xl">Create an account</h1>
        <h3 className="text-balance text-center px-4">Enter your email below to create your account</h3>
        <br/>
        <RegisterForm/>
      </ContentWrapper>
    </>
  )
}