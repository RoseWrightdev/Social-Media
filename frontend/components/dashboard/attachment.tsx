import { Endpoint } from "@/lib/endpoint";
import { handleAttachmentURI } from "@/lib/utils";
import { DecisionTree } from "@/lib/endpoint";
import {AttachmentRes} from "@/lib/types"
import Image from "next/image";

interface params {
  postId: string
}

export default async function Attachment({postId}: params) {
  const tree: DecisionTree = {
    200 : async (res: Response)=> {
      const json: AttachmentRes = await res.json()
      return json
    },
  }
  const req = {parent: postId}
  const getAttachment = new Endpoint("POST", "attachment", req, tree)
  const res: AttachmentRes = await getAttachment.Exec()

  const attachmentType = handleAttachmentURI(res.fileExtension)
  const imageSrc = `data:${attachmentType}/${res.fileExtension.replace('.', '')};base64,${res.encodedAttachment}`;

  if (attachmentType === "image"){
  return (
    <div className="relative min-h-[400px] overflow-hidden rounded-2xl">
      <Image src={imageSrc} alt={postId} fill={true} />
    </div>
  )} 
  else {
    return (
      <div className="relative min-h-[400px] overflow-hidden rounded-2xl">
        <video src={imageSrc} controls />
      </div>
    )
  }
}
