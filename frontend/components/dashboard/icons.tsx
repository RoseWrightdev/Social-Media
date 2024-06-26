import Link from "next/link"

export function ProfilePicture() {
  return (
    <Link href={"/dashboard/profile"}>
      <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
    </Link>
  )
}

export function Settings() {
  return (
    <Link href={"/dashboard/settings"}>
      <div className="w-8 h-8 bg-red-500 rounded-full"></div>
    </Link>
  )
}

export function Logo() {
  return (
    <Link href={"/dashboard"}>
      <div className="w-8 h-8 bg-slate-900 rounded-full"></div>
    </Link>
  )
}