'use client'

import { useState, useRef } from "react";
import { Button } from "../ui/button"
import { FaAngleRight, FaPlus } from "react-icons/fa6";
import useAutosizeTextArea from "@/lib/hooks/useAutosizeTextArea"

export default function WriteFrom() {
  const [text, setText] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  let length = text.length

  useAutosizeTextArea(textAreaRef.current, text);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value;
    setText(val);
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="w-full">
          <div className="border-2 rounded-2xl border-slate-950">
            <textarea
              placeholder="What do you think?"
              className="w-full text-2xl rounded-2xl pt-6 pb-4 px-5 select-none placeholder:italic placeholder:text-slate-500 resize-none placeholder:font-thin outline-none"
              rows={1}
              onChange={handleChange}
              value={text}
              ref={textAreaRef}
              />
          </div>
        </div>
        <div className="mt-2">
          <Button className="rounded-lg bg-white border-2 border-slate-950 hover:bg-slate-100" onClick={()=> console.log(text)}>
            <FaPlus className="h-8 text-slate-950"/>
          </Button>
          <span className="mx-2">
            <Button className="rounded-lg bg-white border-2 border-slate-950 hover:bg-slate-100" onClick={()=> console.log(text)}>
              <FaAngleRight className="h-8 text-slate-950"/>
            </Button>
          </span>
          <span className="">{length}</span>
        </div>
      </div>   
    </>
  )
} 