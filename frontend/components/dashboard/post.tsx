import type { ProfilePicture_Username } from "@/lib/types"
import { Suspense } from "react"
import Image from "next/image";

export default function Post(userData: ProfilePicture_Username, text: string, likes: number, imageURI?: string, videoURI?: string, alt?: string) {
const username = userData.username;
const profilePictureURI = userData.profilePictureURI;
const profilePictureAlt = userData.alt;

  return (
    <div className="flex flex-col">
      <div className="flex">
        <Image src={profilePictureURI} alt={profilePictureAlt} className="rounded-full w-8 h-8 m-2" />
        <div className="italic text-lg">@{username}</div>
      </div>
      <p>{text}</p>
        <Suspense fallback={<>loaing...</>}>
          <div>Attachment</div>
        </Suspense>
    </div>
  )

}