'use sever'
import GET_UserById from "@/lib/GET_UserById";
import { Suspense } from "react"
import Logout from "@/components/auth/logoutButton";
import { verifySession } from "@/lib/dataAccessLayer";
import { User_TYPE } from "@/lib/types";



export default async function Page() { 
  const session = await verifySession();
  const user:User_TYPE = await GET_UserById(session.userId.toString());
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <div>
          <div>id:{user.id}</div>
          <div>username:{user.username}</div>
          <div>email:{user.email}</div>
          <div>password:{user.password}</div>
          <br />
        </div>
      </Suspense>
      <Logout/>
    </div>
  );
}