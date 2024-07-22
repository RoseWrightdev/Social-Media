import Image from "next/image";
import { PostData } from "@/lib/types";
import { handleAttachmentURI } from "@/lib/utils";

export default function Post({textContent, encodedAttachment, fileExtension, postID, parentID}: PostData) {
  const attachmentType = handleAttachmentURI(fileExtension)
  const imageSrc = `data:${attachmentType}/${fileExtension.replace('.', '')};base64,${encodedAttachment}`;

  return (
    <>
      <br />
      {/* */}
      <div className="mb-8">
        <div className="flex">
          <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
          <h3 className="italic font-thin text-slate-400 my-auto ml-4">@{parentID}</h3>
        </div>
        <br />
          <div className="ml-2">
            {textContent}
            <br />
            <br />
            <h2>Post ID:</h2>
            {postID}
          </div>
        </div>
      <div className="relative min-h-[400px] overflow-hidden rounded-2xl">
        <Image src={imageSrc} alt={postID} fill={true} />
      </div>
    </>
  );
}
