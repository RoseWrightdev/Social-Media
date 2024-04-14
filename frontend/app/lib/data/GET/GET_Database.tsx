import { SERVER_PATH } from '@/app/lib/utils/constants'
import { GET_Database_TYPE } from '@/app/lib/utils/types'

async function getData() {
  const res = await fetch(SERVER_PATH + "/database")
  if(!res.ok){
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

export default async function GET_Database() {
  const dataArr = await getData()
  const data: GET_Database_TYPE = dataArr[0]
  return (
    <>
      <div>id: {data.id}</div>
      <div>username: {data.username}</div>
      <div>email: {data.email}</div>
    </>
  )
}
