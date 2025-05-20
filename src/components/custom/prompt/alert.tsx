'use client'

import { useEffect, useState } from "react";
import { eventOn } from "@/lib/events";
import { nextZIndex } from "@dootask/tools";
import { uuidv4 } from "@/lib/utils";
import AlertItem from "./alert-item";

/**
 * 弹窗提示组件 - 用于显示模态对话框
 * 
 * 支持多种类型的提示（成功、警告、错误、输入框、关闭），可自定义标题、描述、按钮等。
 * 通过事件系统触发显示，支持异步操作和自定义回调。
 * 
 * @example
 * ```tsx
 * // 基本用法
 * import { eventEmit } from '@/lib/events'
 * 
 * // 成功提示
 * eventEmit('alert', {
 *   type: 'success',
 *   title: '操作成功',
 *   description: '数据已保存'
 * })
 * 
 * // 带确认和取消的警告
 * eventEmit('alert', {
 *   type: 'warning',
 *   title: '确认删除',
 *   description: '此操作不可恢复',
 *   onConfirm: async () => {
 *     await deleteData()
 *   }
 * })
 * 
 * // 输入框提示
 * eventEmit('alert', {
 *   type: 'prompt',
 *   title: '请输入名称',
 *   placeholder: '请输入',
 *   defaultValue: '默认值',
 *   buttonText: '确定',
 *   onConfirm: (value) => {
 *     console.log('输入的值:', value)
 *   }
 * })
 * ```
 */

export interface AlertProps {
  /** 提示类型 */
  type: "success" | "warning" | "error" | "prompt" | "close"
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
