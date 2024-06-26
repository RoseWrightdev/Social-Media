'use sever'
import { getUserById } from "@/lib/utils";
import { verifySession } from "@/lib/dataAccessLayer";
import { User } from "@/lib/types";
import WriteForm from "@/components/dashboard/writeForm";


export default async function Page() { 
  const session = await verifySession();
  const user:User = await getUserById(session.userId.toString());
  const username = user.username;
  // const profilePicture = user.profilePicture;
  // const 
  return (
   <main>
    <WriteForm/>
   </main>
  );
}