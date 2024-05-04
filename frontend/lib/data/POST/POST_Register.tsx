import { SERVER_PATH } from "@/lib/constants"
import { POST_Register_TYPE } from "@/lib/types"

async function postData(data: POST_Register_TYPE) { 
  const res = await fetch(SERVER_PATH + "/register", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if(!res.ok){
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

export default async function POST_Register(data: POST_Register_TYPE) {
  const dataArr = await postData(data)
  return dataArr
}