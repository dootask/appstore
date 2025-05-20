'use client'

import { useEffect, useState } from "react";
import { eventOn } from "@/lib/events";
import { nextZIndex } from "@dootask/tools";
import { uuidv4 } from "@/lib/utils";
import AlertItem from "./alert-item";

export type AlertType = "success" | "warning" | "error" | "info" | "prompt"

export interface AlertProps {
  /** 提示类型 */
  type: AlertType
  /** 提示标题 */
  title: string
  /** 提示描述 */
  description?: string

  /** 输入框占位符（仅 prompt 类型有效） */
  placeholder?: string
  /** 输入框默认值（仅 prompt 类型有效） */
  defaultValue?: string
  /** 确认按钮文本（仅 prompt 类型有效） */
  buttonText?: string

  /** 是否显示取消按钮 */
  showCancel?: boolean
  /** 是否显示确认按钮（prompt 类型无效） */
  showConfirm?: boolean

  /** 点击遮罩是否关闭 */
  closeOnClickMask?: boolean
  /** 自定义层级 */
  zIndex?: number

  /** 确认回调函数 */
  onConfirm?: (value?: string) => void | Promise<void>
  /** 取消回调函数 */
  onCancel?: () => void

  /** 内部使用：是否正在关闭 */
  __closeIng?: boolean
}

/** @internal 内部使用的接口，用于管理弹窗实例 */
export interface __AlertItem extends AlertProps {
  /** 唯一标识 */
  id: string
  /** 关闭后的回调 */
  afterClose: () => void
}

export default function AlertPortal() {
  const [alerts, setAlerts] = useState<__AlertItem[]>([])

  useEffect(() => {
    const off = eventOn("alert", (args: unknown) => {
      const item = args as __AlertItem
      if (item.__closeIng) {
        setAlerts(prev => prev.map(alert =>
          alert.id === item.id ? {...alert, __closeIng: true} : alert
        ))
        return;
      }
      item.id = item.id ?? uuidv4()
      item.type = item.type ?? "success"
      item.showCancel = item.showCancel ?? true
      item.showConfirm = item.showConfirm ?? true
      item.closeOnClickMask = item.closeOnClickMask ?? true
      item.zIndex = item.zIndex ?? (nextZIndex() + 500)
      item.afterClose = () => setAlerts(prev => prev.filter(({id}) => id !== item.id))
      setAlerts(prev => [...prev, item])
    })
    return () => {
      off()
    }
  }, [])

  return (
    <>
      {alerts.map((alert) => (
        <AlertItem key={alert.id} {...alert} />
      ))}
    </>
  )
}