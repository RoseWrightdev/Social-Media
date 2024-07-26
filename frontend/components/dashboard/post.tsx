import { PostData } from "@/lib/types";
import Attachment from "./attachment";
import Pfp from "./pfp";
import Username from "./username"
import { Suspense } from "react";
import { AttachmentSkeleton } from "../skeletons";

export default function Post({textContent, postID, parentID}: PostData) {
  
  return (
    <>
      <br />
      {/* */}
      <div className="mb-8">
        <div className="flex">
        <Suspense fallback={<>loading pfp...</>}>
          <Pfp userId={parentID} />
        </Suspense>
          <h3 className="text-slate-400 my-auto ml-2 lowercase">@{<Username userId={parentID}/>}</h3>
        </div>
        <br />
          <div className="ml-2">
            {textContent}
            <br />
            <br />
          </div>
          <Suspense fallback={<AttachmentSkeleton/>}>
            <Attachment postId={postID}/>
          </Suspense>

      </div>
    </>
  );
}
