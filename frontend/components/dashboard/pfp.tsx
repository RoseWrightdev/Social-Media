import { Endpoint } from "@/lib/endpoint";
import { handleAttachmentURI } from "@/lib/utils";
import { DecisionTree } from "@/lib/endpoint";
import {AttachmentRes} from "@/lib/types"
import Image from "next/image";
import React from "react";

interface params {
  userId: string
}

export default async function Pfp({userId}: params) {
  const tree: DecisionTree = {
    200 : async (res: Response)=> {
      const json: AttachmentRes = await res.json()
      return json
    },
    500 : () => {
      return <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
    }
  }
  const req = {userId: userId}
  const getAttachment = new Endpoint("POST", "pfp", req, tree)
  const res: AttachmentRes = await getAttachment.Exec()

  if (React.isValidElement(res)) {
    return res
  } else {
    const attachmentType = handleAttachmentURI(res.fileExtension)
    const imageSrc = `data:${attachmentType}/${res.fileExtension.replace('.', '')};base64,${res.encodedAttachment}`;
    return (
      <div className="w-12 h-12 rounded-full">
        <Image src={imageSrc} alt={userId} width={48} height={48} />
      </div>
    )
  }
}
