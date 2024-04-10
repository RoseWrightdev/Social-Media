export async function GET() {
  try{
  const res = await fetch("localhost:8080/test")
  const data = await res.json()
  console.log(Response.json(data))
  return Response.json(data)
} catch (error) {
    console.error(error)
  }
}
