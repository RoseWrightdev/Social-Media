'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoom, useParticipants } from '@/hooks/useRoom';
import { useMediaStream } from '@/hooks/useMediaStream';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomid as string;
  return (
    <></>
  );
}
