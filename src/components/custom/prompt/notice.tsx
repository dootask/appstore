'use client'

import { useEffect, useState } from "react";
import NoticeItem from "./notice-item";
import { eventOn } from "@/lib/events";
import { cn, uuidv4 } from "@/lib/utils";
import { nextZIndex } from "@dootask/tools";

export interface NoticeProps {
  type: "success" | "warning" | "error" | "info" | "text"
  title: string
  description?: string
  duration?: number
  delayShow?: number
  showClose?: boolean
  zIndex?: number
  onClose?: () => void

  __closeIng?: boolean
}

export interface NoticeItem extends NoticeProps {
  id: string
  afterClose: () => void
}

export default function NoticePortal() {
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [zIndex, setZIndex] = useState(0)

  useEffect(() => {
    const off = eventOn("notice", (args: unknown) => {
      const item = args as NoticeItem
      if (item.__closeIng) {
        setNotices(prev => prev.map(notice =>
          notice.id === item.id ? {...notice, __closeIng: true} : notice
        ))
        return;
      }
      item.id = item.id ?? uuidv4()
      item.duration = item.duration ?? 6000
      item.delayShow = item.delayShow ?? 0
      item.showClose = item.showClose ?? true
      item.zIndex = Math.max(zIndex, item.zIndex ?? (nextZIndex() + 1000))
      item.afterClose = () => setNotices(prev => prev.filter(({id}) => id !== item.id))
      setNotices(prev => [...prev, item])
      setZIndex(item.zIndex)
    })
    return () => {
      off()
    }
  }, [zIndex])

  return (
    <>
      <div
        aria-live="assertive"
        className={cn(
          'pointer-events-none fixed inset-0 hidden flex-col-reverse justify-end px-4 py-6 sm:p-6',
          notices.length > 0 && 'flex'
        )}
        style={{zIndex: zIndex}}
      >
        {notices.map((item) => (
          <NoticeItem key={item.id} {...item} />
        ))}
      </div>
    </>
  )
}
