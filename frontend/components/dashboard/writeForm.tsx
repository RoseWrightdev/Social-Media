import { Button } from "../ui/button"
import { FaPenFancy } from "react-icons/fa6";

export default function WriteFrom() {
  return (
    <>
      <div className="flex">
        <div className="mx-4 w-full">
          <div className="border-[0.5px] rounded-2xl border-slate-950">
            <textarea name="" id="" className="w-full text-2xl rounded-2xl resize-none" rows={2}></textarea>
          </div>
        </div>
        <Button className="h-16 w-16 my-auto rounded-full">
          <FaPenFancy className="text-2xl" />
        </Button>
      </div>   
    </>
  )
}