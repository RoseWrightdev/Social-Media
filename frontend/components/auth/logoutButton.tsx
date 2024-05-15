'use client'

import { Button } from '@/components/ui/button';
import { deleteSession } from '@/lib/session';

export default function Logout() {
  return (
  <Button onClick={() => deleteSession()}>
    Logout
  </Button>
  );
}