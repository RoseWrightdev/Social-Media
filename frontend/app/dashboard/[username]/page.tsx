export default function Page({params}: {params: {username: string}}) {
  return (
    <>
      <h1>{params.username}</h1>
    </>
  )
}