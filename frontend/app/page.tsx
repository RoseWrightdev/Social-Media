import GET_ServerTest from "@/app/lib/data/GET/GET_ServerTest"
import GET_Database from "@/app//lib/data/GET/GET_Database"

export default function Home(){

  return (
    <>
      <GET_ServerTest/>
      <GET_Database/>
    </>
  )
}