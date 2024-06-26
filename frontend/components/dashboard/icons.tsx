import Link from "next/link"
import { FaGear, FaCircleUser } from "react-icons/fa6";
import Image from "next/image";
import LogoImg from "@/public/Logo.png"
import { verifySession } from "@/lib/dataAccessLayer";
import { getUserById } from "@/lib/utils";
import { User } from "@/lib/types";

export async function ProfilePicture() {
  const session = await verifySession()
  const user:User = await getUserById(session.userId.toString())
  const username = user.username;
  return (
    <Link href={`/dashboard/${username}`}>
      <FaCircleUser className="w-12 h-12 text-slate-900"/>
    </Link>
  )
}

export function Settings() {
  return (
    <Link href={`/dashboard/settings`}>
      <FaGear className="w-12 h-12 text-slate-900" />
    </Link>
  )
}

export function Logo() {
  return (
    <Link href={"/dashboard"}>
      <div className="w-12 h-12 rounded-full">
        <Image src={LogoImg} alt={"Logo of a silly face."}></Image>
      </div>
    </Link>
  )
}
