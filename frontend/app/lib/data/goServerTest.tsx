import { ROUTE_SERVER_PATH } from '@/app/lib/utils/routeConstants'

async function getData() {
  const res = await fetch(ROUTE_SERVER_PATH + "/test")

  if(!res.ok){
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

export default async function GoServerTest() {
  const data = await getData()
 
  return (
    <>
      <div>{data[0].Port}</div>
      <div>{data[0].Status}</div>
    </>
  )
}
