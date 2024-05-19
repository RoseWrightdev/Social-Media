import { SERVER_PATH } from "@/lib/constants"
import { POST_Register_TYPE} from "@/lib/types"
import { createSession } from "@/lib/session"


export default async function POST_Register(ValdiatedFormData: POST_Register_TYPE){
   //vaidated zod ValdiatedFormData
   const password = ValdiatedFormData.password 
   const email = ValdiatedFormData.email
   const username = ValdiatedFormData.username
 
   //post ValdiatedFormData to server
   const req = await fetch(`${SERVER_PATH}/register/${email}/${username}/${password}`,{
     method: 'POST',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(ValdiatedFormData)
   })
   
   //handle server request
   //if email and/or username is already in use
   if (req.status === 409) {
     return req.status
   } 
   //check for server error
   else if (!req.ok) {
     throw new Error('Failed to post ValdiatedFormData')
   } 
   //if successful, create session using the user id from the ValdiatedFormDatabase return null
   else {
     const res = await req.json();
     createSession(res.id)
     return 200;
   }
}