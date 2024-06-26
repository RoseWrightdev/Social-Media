'use client'

import { useState } from "react";
import { Button } from "../ui/button"
import { FaPenFancy } from "react-icons/fa6";

export default function WriteFrom() {
  const [text, setText] = useState('');

  return (
    <>
      <div className="flex">
        <div className="mx-4 w-full">
          <div className="border-[0.5px] rounded-2xl border-slate-950">
            <textarea name="" className="w-full text-2xl rounded-2xl resize-none" rows={2} onChange={(e) => setText(e.target.value)}/>
          </div>
        </div>
        <Button className="h-16 w-16 my-auto rounded-full" onClick={()=> console.log(text)}>
          <FaPenFancy className="text-2xl" />
        </Button>
      </div>   
    </>
  )
}