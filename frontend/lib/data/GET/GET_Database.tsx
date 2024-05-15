import { SERVER_PATH } from '@/lib/constants'
import { GET_Database_TYPE } from '@/lib/types'
import { verifySession } from '@/lib/dataAccessLayer'

async function getData() {
  const req = await fetch(SERVER_PATH + "/database", {cache: "no-store"})
  if(!req.ok){
    throw new Error('Failed to fetch data')
  }
  const res = await req.json()
  return res
};

export default async function GET_Database() {
  const session = await verifySession()
  if(session === null){
    throw new Error('Failed to verify session')
  }
  const res = await getData()

  return (
    res.map((data: GET_Database_TYPE) => {
    return (
      <>
        <div>id:{data.id}</div>
        <div>username:{data.username}</div>
        <div>email:{data.email}</div>
        <div>password:{data.password}</div>
        <br />
      </>
    )
   })
  );
};
