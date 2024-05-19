import { SERVER_PATH } from "@/lib/constants";


export default async function POST_ResetPassword(email: string){
//resetpassword always returns 200, even if the email is not found
  await fetch(`${SERVER_PATH}/resetpassword/${email}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  })
}