import { SERVER_PATH } from "@/lib/constants"
import { POST_Register_TYPE } from "@/lib/types"

async function postData(data: POST_Register_TYPE){ 
  const res = await fetch(SERVER_PATH + "/register", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  if(res.status === 409){
    return { status: 409, data: null, error: 'Email and/or username is already in use' }
  }

  else if(!res.ok){
    throw new Error('Failed to post data')
  }

  else {
    const jsonData = await res.json();
    return { status: res.status, data: jsonData, error: null }
  }
}

export default async function POST_Register(data: POST_Register_TYPE){
  const response = await postData(data)
  return response
}