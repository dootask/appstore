import AlertPortal, {type AlertProps} from "./alert";
import NoticePortal, {type NoticeProps} from "./notice";
import ToastPortal, {type ToastProps} from "./toast";
import {eventEmit} from "@/lib/events.ts";

/**
 * Alert 组件 - 用于显示模态的提示消息
 * 
 * 支持多种类型的提示（成功、警告、错误、信息、纯文本），可自定义标题、描述、显示时间等。
 * 支持自动关闭和手动关闭。
 * 
 * @example
 * ```tsx
 * // 基本用法
 * Alert({
 *   type: 'success',
 *   title: '操作成功',
 *   description: '数据已保存'
 * })
 * 
 * // 自定义显示时间
 * Alert({
 *   type: 'warning',
 *   title: '警告',
 *   description: '请注意...',
 *   duration: 10000, // 10秒后自动关闭
 *   showClose: true
 * })
 * 
 * // 手动关闭
 * const close = Alert({
 *   type: 'info',
 *   title: '提示',
 *   description: '这是一条可以手动关闭的消息'
 * })
 * 
 * // 在需要时关闭
 * close()
 * ```
 */
export function Alert(props: AlertProps) {
  eventEmit("alert", props)
  return () => {
    eventEmit("alert", {
      ...props,
      __closeIng: true
    })
  }
}

/**
 * Notice 组件 - 用于显示非模态的提示消息
 * 
 * 支持多种类型的通知（成功、警告、错误、信息、纯文本），可自定义标题、描述、显示时间等。
 * 支持自动关闭和手动关闭。
 * 
 * @example
 * ```tsx
 * // 基本用法
 * Notice({
 *   type: 'success',
 *   title: '操作成功',
 *   description: '数据已保存'
 * })
 * 
 * // 自定义显示时间
 * Notice({
 *   type: 'warning',
 *   title: '警告',
 *   description: '请注意...',
 *   duration: 10000, // 10秒后自动关闭
 *   showClose: true
 * })
 * 
 * // 手动关闭
 * const close = Notice({
 *   type: 'info',
 *   title: '提示',
 *   description: '这是一条可以手动关闭的消息'
 * })
 * 
 * // 在需要时关闭
 * close()
 * ```
 */
export function Notice(props: NoticeProps) {
  eventEmit("notice", props)
  return () => {
    eventEmit("notice", {
      ...props,
      __closeIng: true
    })
  }
}

/**
 * Toast 组件 - 用于显示轻量级的反馈信息。
 *
 * 支持多种类型的消息（成功、警告、错误、信息、纯文本），可自定义显示时长、内容和位置。
 * 支持自动关闭和手动关闭。
 *
 * @example
 * ```tsx
 * // 基本用法
 * Toast({
 *   content: '一条新的消息'
 * })
 *
 * // 警告消息，从底部弹出
 * Toast({
 *   type: 'warning',
 *   content: '请注意...',
 *   direction: 'bottom',
 *   duration: 5000 // 5秒后自动关闭
 * })
 *
 * // 手动关闭
 * const close = Toast({
 *   type: 'info',
 *   content: '这是一条可以手动关闭的消息'
 * })
 *
 * // 在需要时关闭
 * close()
 * ```
 */
export function Toast(props: ToastProps) {
  eventEmit("toast", props)
  return () => {
    eventEmit("toast", {
      ...props,
      __closeIng: true
    })
  }
}

/**
 * PromptPortal 组件 - 用于在全局注入提示组件的容器
 * 
 * 该组件需要在应用的根组件中注入，以确保 Alert、Notice 和 Toast 组件能够正常工作。
 * 它负责渲染所有提示组件的 Portal 容器。
 * 
 * @example
 * ```tsx
 * // 在应用的根组件（如 App.tsx 或 layout.tsx）中注入
 * import { PromptPortal } from '@/components/custom/prompt'
 * 
 * export default function App() {
 *   return (
 *     <>
 *       <App />
 *       <PromptPortal />
 *     </>
 *   )
 * }
 * ```
 */
export default function PromptPortal() {
  return (
    <>
      <AlertPortal/>
      <NoticePortal/>
      <ToastPortal/>
    </>
  )
}
