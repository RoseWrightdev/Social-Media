import Post from "@/components/dashboard/post"
import { Suspense } from "react"
import { Endpoint } from "@/lib/endpoint"
import { PostData } from "@/lib/types"
import { DecisionTree } from "@/lib/endpoint"

export default async function Feed(){
  const tree: DecisionTree = {
    200 : async (res: Response)=> {
      const posts: PostData[] = await res.json()
      return posts
    },
  }
  const getPosts = new Endpoint("GET", "posts", null, tree)
  const posts = await getPosts.Exec()
  
  return (
      <Suspense fallback={<>loading...</>}>
          <Post 
            postID={posts[0].postID} 
            parentID={posts[0].parentID} 
            encodedAttachment={posts[0].encodedAttachment} 
            fileExtension={posts[0].fileExtension} 
            textContent={posts[0].textContent} 
            key={posts[0].postID}
           />
      </Suspense>
    )  
  }
