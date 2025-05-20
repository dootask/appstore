'use client'

import { useEffect, useState } from "react";
import NoticeItem from "./notice-item";
import { eventOn } from "@/lib/events";
import { uuidv4 } from "@/lib/utils";
import { nextZIndex } from "@dootask/tools";
import { Portal } from "./portal";

/**
 * 通知提示组件 - 用于显示非模态的提示消息
 * 
 * 支持多种类型的通知（成功、警告、错误、信息、纯文本），可自定义标题、描述、显示时间等。
 * 通过事件系统触发显示，支持自动关闭和手动关闭。
 * 
 * @example
 * ```tsx
 * // 基本用法
 * import { eventEmit } from '@/lib/events'
 * 
 * // 成功通知
 * eventEmit('notice', {
 *   type: 'success',
 *   title: '操作成功',
 *   description: '数据已保存'
 * })
 * 
 * // 自定义显示时间
 * eventEmit('notice', {
 *   type: 'warning',
 *   title: '警告',
 *   description: '请注意...',
 *   duration: 10000, // 10秒后自动关闭
 *   showClose: true
 * })
 * 
 * // 延迟显示
 * eventEmit('notice', {
 *   type: 'info',
 *   title: '提示',
 *   description: '将在3秒后显示',
 *   delayShow: 3000
 * })
 * ```
 */

export type NoticeType = "success" | "warning" | "error" | "info" | "text"

export interface NoticeProps {
  /** 通知类型 */
  type: NoticeType
  /** 通知标题 */
  title: string
  /** 通知描述 */
  description?: string
  /** 显示时长（毫秒） */
  duration?: number
  /** 延迟显示时间（毫秒） */
  delayShow?: number
  /** 是否显示关闭按钮 */
  showClose?: boolean
  /** 自定义层级 */
  zIndex?: number
  /** 关闭回调函数 */
  onClose?: () => void

  /** 内部使用：是否正在关闭 */
  __closeIng?: boolean
}

/** @internal 内部使用的接口，用于管理通知实例 */
export interface __NoticeItem extends NoticeProps {
  /** 唯一标识 */
  id: string
  /** 关闭后的回调 */
  afterClose: () => void
}

export default function NoticePortal() {
  const [notices, setNotices] = useState<__NoticeItem[]>([])
  const [zIndex, setZIndex] = useState(0)

  useEffect(() => {
    const off = eventOn("notice", (args: unknown) => {
      const item = args as __NoticeItem
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

  if (notices.length === 0) return null

  return (
    <Portal>
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 bottom-auto flex flex-col-reverse justify-end px-4 py-6 sm:p-6"
        style={{zIndex: zIndex}}
      >
        {notices.map((item) => (
          <NoticeItem key={item.id} {...item} />
        ))}
      </div>
    </Portal>
  )
}
