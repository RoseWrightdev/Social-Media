import { SERVER_PATH } from '@/lib/constants'
import { User_TYPE } from '@/lib/types'
import { createSession } from "@/lib/session"

async function getData(email: string, password: string) {

  const req = await fetch(SERVER_PATH + "/login/" + email + "/" + password, {cache: "no-store"})
  if(req.status === 401){
    return {status: 401, user: null}
  }

  else if(!req.ok){
    throw new Error('Something went wrong while attempting to login. Failed to fetch.')
  }

  else {
    const res: User_TYPE = await req.json();
    createSession(res.id)
    return {status: 200, user: res}
  }
}


export default async function GET_Login(email: string, password: string) {
  const data = await getData(email, password)
  console.log(data + "GET_Login")
  return data
}
