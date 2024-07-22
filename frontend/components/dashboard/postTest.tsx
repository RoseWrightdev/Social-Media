import Image from "next/image";
import { PostData } from "@/lib/types";
import { handleAttachmentURI } from "@/lib/utils";

export default function PostTest({textContent, encodedAttachment, fileExtension, postID, parentID}: PostData) {
  const attachmentType = handleAttachmentURI(fileExtension)
  const imageSrc = `data:${attachmentType}/${fileExtension.replace('.', '')};base64,${encodedAttachment}`;

  return (
    <>
      <br />
      <div>
        <h1>parentID</h1>
        <h2>{parentID}</h2>

        <h1>postID</h1>
        <h2>{postID}</h2>

        <h1>fileExtension</h1>
        <h2>{fileExtension}</h2>

        <h1>textContent</h1>
        <h2>{textContent}</h2>

        <Image src={imageSrc} alt={""} width={400} height={400  }/>
        </div>
    </>
  );
}

