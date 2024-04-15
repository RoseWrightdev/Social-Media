import { SERVER_PATH } from '@/app/lib/utils/constants'
import { GET_SeverTest_TYPE } from '@/app/lib/utils/types'

async function getData() {
  const res = await fetch(SERVER_PATH + "/test")

  if(!res.ok){
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

export default async function GET_ServerTest() {
  const dataArr = await getData()
  const data: GET_SeverTest_TYPE = dataArr[0]
  return (
    <>
      <h1>Go Server</h1>
      <div>port: {data.port}</div>
      <div>status: {data.status}</div>
    </>
  )
}
