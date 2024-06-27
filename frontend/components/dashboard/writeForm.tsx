'use client'

import { useState } from "react";
import { Button } from "../ui/button"
import { FaAngleRight, FaPlus } from "react-icons/fa6";

export default function WriteFrom() {
  const [text, setText] = useState('');

  return (
    <>
      <div className="flex">
        <div className="mx-4 w-full">
          <div className="border-[0.5px] rounded-2xl border-slate-950">
            <textarea placeholder="What do you think?" className="w-full text-lg rounded-2xl resize-none p-4 select-none placeholder:italic placeholder:font-thin outline-none"
             onChange={(e) => setText(e.target.value)}/>
          </div>
        </div>
        <div className="my-auto">
          <Button className=" my rounded-t-lg" onClick={()=> console.log(text)}>
            <FaPlus className="h-8"/>
          </Button>
          <Button className=" rounded-b-lg" onClick={()=> console.log(text)}>
           <FaAngleRight className="h-8"/>
          </Button>
        </div>
      </div>   
    </>
  )
}