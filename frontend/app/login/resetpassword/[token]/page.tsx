import UpdatePasswordForm from '@/components/auth/updatePasswordForm'
import z from 'zod'
import ContentWrapper from '@/components/auth/contentwrapper'

export default function Page({params}: {params: {token: string}}) {
  const tokenSchema = z.object({
    token: z.string()
  })
  const unsanitaizedToken = params.token
  const sanitaizedToken = tokenSchema.parse({unsanitaizedToken})
  const token = sanitaizedToken.token
  
  return (
    <>
      <ContentWrapper>
        <h1 className="font-black text-3xl">Update your password</h1>
        <h3 className="text-balance text-center px-4">Enter and confirm your password below</h3>
        <br/>
        <UpdatePasswordForm token={token}/>
      </ContentWrapper>
  </>
  )
}