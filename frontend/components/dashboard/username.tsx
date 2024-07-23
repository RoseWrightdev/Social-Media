import { Endpoint } from "@/lib/endpoint";
import { DecisionTree } from "@/lib/endpoint";
import React from "react";
import { Username } from "@/lib/types";

interface params {
  userId: string
}

export default async function Pfp({userId}: params) {
  const tree: DecisionTree = {
    200 : async (res: Response)=> {
      const json: Username = await res.json()
      return json
    },
    500 : () => {
      return <span>{userId}</span>
    }
  }
  const req = {userId: userId}
  const getAttachment = new Endpoint("POST", "username", req, tree)
  const res: Username = await getAttachment.Exec()

  if (React.isValidElement(res)) {
    return res
  } else {
    return (
      <span>{res.username}</span>
    )
  }
}