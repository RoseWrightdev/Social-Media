import LoginForm from "@/components/auth/loginForm";
import Link from 'next/link'
import ContentWrapper from "@/components/auth/contentwrapper";

export default function login(){
  return (
    <>
     <ContentWrapper>
        <Link href={"/register"} className="absolute top-6 right-6">Sign up</Link>
        <h1 className="font-black text-3xl">Login to your account</h1>
        <h3 className="text-balance text-center px-4">Enter your email and password below</h3>
        <br/>
        <LoginForm/>
        <Link href={"/forgotpassword"} className="">forgot password</Link>
      </ContentWrapper>
    </>
  )
}

