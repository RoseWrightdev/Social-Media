import { AttachmentSkeleton, PfpSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <>
        <div className="mt-8 h-[10vh] bg-slate-50 rounded-lg"></div>
        <PfpSkeleton/>
        <AttachmentSkeleton/>
    </>
  )
}