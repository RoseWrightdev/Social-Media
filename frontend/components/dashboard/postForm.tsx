'use client'

import { useState, useRef } from "react";
import { Button } from "../ui/button"
import { FaAngleRight, FaPlus } from "react-icons/fa6";
import useAutosizeTextArea from "@/lib/hooks/useAutosizeTextArea"
import CharecterCount from "./CharecterCount";

export default function PostFrom() {
  const [text, setText] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const charecterLeft = 256 - text.length
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
              maxLength={281}
              onChange={handleChange}
              ref={textAreaRef}
              value={text}
            />
          </div>
        </div>
        <div className="mt-2 flex justify-between">
          <div className="flex">
            <Button className="rounded-lg bg-white border-2 border-slate-950 hover:bg-slate-100" onClick={()=> console.log(text)}>
              <FaPlus className="h-8 text-slate-950"/>
            </Button>
            <span className="mx-2 my-auto">
              <CharecterCount charectersLeft={charecterLeft} totalCharecters={256}/>
            </span>
          </div>
          <Button className="rounded-lg bg-white border-2 border-slate-950 hover:bg-slate-100" onClick={()=> console.log(text)}>
            <FaAngleRight className="h-8 text-slate-950"/>
          </Button>
        </div>
      </div>   
    </>
  )
} 