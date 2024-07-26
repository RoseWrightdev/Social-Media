import { PostData } from "@/lib/types";
import Attachment from "./attachment";
import Pfp from "./pfp";
import Username from "./username"
import { Suspense } from "react";
import { AttachmentSkeleton, PfpSkeleton } from "../skeletons";

export default function Post({textContent, postID, parentID}: PostData) {
  
  return (
    <>
      <br />
      {/* */}
      <div className="mb-8">
        <div className="flex">
        <Suspense fallback={<PfpSkeleton/>}>
          <Pfp userId={parentID} />
        </Suspense>
        <Suspense fallback={<h3 className="text-slate-400 ml-2 my-auto lowercase">@loading</h3>}>
          <h3 className="text-slate-400 my-auto ml-2 lowercase">@{<Username userId={parentID}/>}</h3>
        </Suspense>
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
