import { SERVER_PATH } from '@/lib/constants'
import { GET_Sever_TYPE } from '@/lib/types'

async function getData() {
  const res = await fetch(SERVER_PATH + "/test")

  if(!res.ok){
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

export default async function GET_Server() {
  const dataArr = await getData()
  const data: GET_Sever_TYPE = dataArr[0]
  return (
    <>
      <h1>Go Server</h1>
      <div>port: {data.port}</div>
      <div>status: {data.status}</div>
    </>
  )
}
