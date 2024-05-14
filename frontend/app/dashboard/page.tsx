'use client'

import GET_Database from "@/lib/data/GET/GET_Database"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { deleteSession } from "@/lib/session";

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <GET_Database/>
      </Suspense>
      <Button onClick={() => deleteSession()}>
        Logout
      </Button>
    </div>
  );
}