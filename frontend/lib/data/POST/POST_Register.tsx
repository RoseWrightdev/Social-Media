import { SERVER_PATH } from "@/lib/constants"
import { POST_Register_TYPE} from "@/lib/types"
import { createSession } from "@/lib/session"
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'


async function postData(data: POST_Register_TYPE){ 
  //vaidated zod data
  const password = data.password 
  const email = data.email
  const username = data.username

  //post data to server
  const req = await fetch(SERVER_PATH + "/register/" + email + "/" + username + "/" + password,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  //handle server request
  //if email and/or username is already in use
  if (req.status === 409) {
    return req.status
  } 
  //check for server error
  else if (!req.ok) {
    throw new Error('Failed to post data')
  } 
  //if successful, create session using the user id from the database return null
  else {
    const res = await req.json();
    createSession(res.id)
    redirect('/dashboard')
  }
}

export default async function POST_Register(ValdiatedFormData: POST_Register_TYPE){
  const reqponse = await postData(ValdiatedFormData)
  return reqponse
}