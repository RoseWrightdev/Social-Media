import { PostData } from "@/lib/types";
import Attachment from "./attachment";

export default function Post({textContent, postID, parentID}: PostData) {
  
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
            {}
          </div>
          <Attachment postId={postID}/>
        </div>
    </>
  );
}
