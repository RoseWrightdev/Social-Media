import Post from "@/components/dashboard/post"
import { Suspense } from "react"
import { Endpoint } from "@/lib/endpoint"
import { PostData } from "@/lib/types"
import { DecisionTree } from "@/lib/endpoint"
import { FeedSkeleton } from "@/components/skeletons"

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
      <Suspense fallback={<FeedSkeleton/>}>
        {
          posts.map((post: PostData) => {
            return(
              <Post 
                postID={post.postID} 
                parentID={post.parentID} 
                textContent={post.textContent} 
                key={post.postID}
              />
            )
          })
        }
      <br />
      </Suspense>
    </> 
    )  
  }
