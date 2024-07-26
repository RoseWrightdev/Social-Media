export function FeedSkeleton() {
  return (
    <>
      <PfpSkeleton/>
      <AttachmentSkeleton/>
    </>
  )
}

export function AttachmentSkeleton() {
  return (
    <>
      <div className="mt-8 h-[50vh] bg-slate-50 rounded-lg"></div>
    </>
  )
}

export function PfpSkeleton() {
  return (
    <>
      <div className="mt-8 h-12 w-12 bg-slate-50 rounded-full"></div>
    </>
  )
}

