import Link from "next/link"
import { FaGear } from "react-icons/fa6";
import { FaCircleUser } from "react-icons/fa6";
import Image from "next/image";
import LogoImg from "@/public/Logo.png"


export function ProfilePicture() {
  return (
    <Link href={"/dashboard/profile"}>
      <FaCircleUser className="w-12 h-12 text-slate-900"/>
    </Link>
  )
}

export function Settings() {
  return (
    <Link href={"/dashboard/settings"}>
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