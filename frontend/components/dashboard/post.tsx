import Image from "next/image";
import { PostData } from "@/lib/types";

export default function Post({textContent, encodedAttachment, fileExtension, postID, parentID}: PostData) {
  const imageSrc = `data:image/${fileExtension.replace('.', '')};base64,${encodedAttachment}`;

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
        <img src={imageSrc} alt="alt" style={{width: '100px', height: '100px'}}/>
        </div>
    </>
  );
}
