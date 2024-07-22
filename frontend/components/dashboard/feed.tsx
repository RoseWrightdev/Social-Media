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
    <>
      <Suspense fallback={<>loading...</>}>
        {
          posts.map((post: PostData) => {
            return(
              <Post 
                postID={post.postID} 
                parentID={post.parentID} 
                encodedAttachment={post.encodedAttachment} 
                fileExtension={post.fileExtension} 
                textContent={post.textContent} 
                key={post.postID}
              />
            )
          })
        }
      </Suspense>
      <br />
    </> 
    )  
  }
