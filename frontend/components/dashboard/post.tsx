import { PostData } from "@/lib/types";
import Attachment from "./attachment";
import Pfp from "./pfp";

export default function Post({textContent, postID, parentID}: PostData) {
  
  return (
    <>
      <br />
      {/* */}
      <div className="mb-8">
        <div className="flex">
          <Pfp userId={parentID} />
          <h3 className="italic font-thin text-slate-400 my-auto ml-4">@{parentID}</h3>
        </div>
        <br />
          <div className="ml-2">
            {textContent}
            <br />
            <br/>
          </div>
          <Attachment postId={postID}/>
      </div>
    </>
  );
}
