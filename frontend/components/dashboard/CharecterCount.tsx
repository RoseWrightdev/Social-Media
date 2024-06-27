'use client'

import { useEffect, useState } from "react"

interface Props {
  charectersLeft: number
  totalCharecters: number
}

export default function CharecterCount({ charectersLeft, totalCharecters }: Props) {
  const [getColor, setColor] = useState("#0c0a09")
  const size = 35
  const ring = size / 10
  const xy = size / 2
  const radius = (size - ring) / 2
  const circumference = 2 * Math.PI * radius
  const offset = (charectersLeft / totalCharecters) * circumference
  const color = getColor

  useEffect(() => {
    if (charectersLeft < 0) {
      setColor("#ef4444");
    } else {
      setColor("#0c0a09");
    }
  }, [charectersLeft]);

  return (
    <>
      <span className="flex">
        <svg height={size} width={size} style={{transform: 'rotate(-90deg)'}} className="my-auto">
          <circle
            cx={xy}
            cy={xy}
            r={radius}
            stroke={color}
            strokeWidth={ring}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - offset}
            strokeLinecap='round'
            fill='transparent'
          />
        </svg>
        {
          charectersLeft < 11
          ?
            <div style={{ fontSize: size / 2, color: color }} className="font-black ml-2">
              {charectersLeft}
            </div>
          :
            null
        }
      </span>
    </>
  )
}