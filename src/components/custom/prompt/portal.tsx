'use client'

/**
 * Portal 组件
 * 
 * 用于将子元素渲染到 DOM 树中的其他位置，常用于模态框、弹出层等场景。
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <Portal>
 *   <div>这个内容会被渲染到 body 下</div>
 * </Portal>
 * 
 * // 高级用法
 * <AdvancedPortal
 *   className="my-portal"
 *   style={{ zIndex: 1000 }}
 *   target={document.getElementById('custom-container')}
 *   as={Fragment}
 * >
 *   <div>自定义渲染位置和样式</div>
 * </AdvancedPortal>
 * ```
 */

import { Fragment, useEffect, useState, type ExoticComponent, type FragmentProps, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * 基础 Portal 组件
 * 
 * @param props.children - 要渲染的内容
 */
export function Portal(props: { children: ReactNode }) {
  const { children } = props
  const [mounted, setMounted] = useState(false)
  const [portalContainer] = useState(() => {
    if (typeof window === 'undefined') return null
    const div = document.createElement('div')
    div.setAttribute('data-normal-portal', '')
    return div
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!portalContainer) return

    document.body.appendChild(portalContainer)

    return () => {
      if (document.body.contains(portalContainer)) {
        document.body.removeChild(portalContainer)
      }
    }
  }, [portalContainer])

  if (!mounted || !portalContainer) return null

  return createPortal(children, portalContainer)
}

/**
 * 高级 Portal 组件
 * 
 * 提供更多自定义选项，如自定义容器、样式和渲染组件
 * 
 * @param props.children - 要渲染的内容
 * @param props.as - 自定义包装组件，默认为 Fragment
 * @param props.target - 自定义目标容器，默认为 document.body
 * @param props.className - 自定义类名
 * @param props.style - 自定义样式
 * 
 * @example
 * ```tsx
 * // 自定义容器和样式
 * <AdvancedPortal
 *   target={document.getElementById('modal-root')}
 *   className="modal-portal"
 *   style={{ zIndex: 1000 }}
 * >
 *   <Modal />
 * </AdvancedPortal>
 * 
 * // 使用自定义包装组件
 * <AdvancedPortal as={CustomWrapper}>
 *   <Tooltip />
 * </AdvancedPortal>
 * ```
 */
export function AdvancedPortal(props: { 
  children: ReactNode; 
  as?: ExoticComponent<FragmentProps> | undefined; 
  target?: HTMLElement | undefined; 
  className?: string; 
  style?: Record<string, string | number> 
}) {
  const {
    children,
    as = Fragment,
    target = document.body,
    className = '',
    style = {}
  } = props

  const [mounted, setMounted] = useState(false)
  const [portalContainer] = useState(() => {
    if (typeof window === 'undefined') return null
    const element = document.createElement('div')
    element.setAttribute('data-advanced-portal', '')
    if (className) element.className = className
    Object.assign(element.style, style)
    return element
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!portalContainer) return

    target.appendChild(portalContainer)

    return () => {
      if (target.contains(portalContainer)) {
        target.removeChild(portalContainer)
      }
    }
  }, [portalContainer, target])

  if (!mounted || !portalContainer) return null

  const Component = as

  return createPortal(
    <Component>{children}</Component>,
    portalContainer
  )
}
