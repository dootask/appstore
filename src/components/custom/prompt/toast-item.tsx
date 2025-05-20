'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Transition } from '@headlessui/react'
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import type { __ToastItem, ToastType, ToastDirection } from './toast'

const typeIconMap: Record<ToastType, React.ElementType | null> = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  text: null,
};

const typeColorMap: Record<ToastType, string> = {
  success: 'text-mantis-400',
  warning: 'text-amber-400',
  error: 'text-coral-400',
  info: 'text-ocean-400',
  text: 'text-gray-900 dark:text-gray-100',
};

export default function ToastItem({
  content,
  type = 'info',
  duration = 3000,
  direction = 'top',
  zIndex,
  onClose,
  afterClose,
  __closeIng
}: __ToastItem) {
  const [show, setShow] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    setShow(false)
    onClose?.()
  }, [onClose])

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, handleClose])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (!show) {
      // 动画结束后再移除dom
      timer = setTimeout(() => {
        afterClose()
      }, 300) // 动画时长 300ms
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [show, afterClose])

  useEffect(() => {
    // 初始直接显示，不像 notice 有 delayShow 的概念
    setShow(true)
  }, [])

  useEffect(() => {
    if (__closeIng) {
      handleClose()
    }
  }, [__closeIng, handleClose])

  const IconComponent = typeIconMap[type];
  const iconColor = typeColorMap[type];

  const getTransitionClasses = (dir: ToastDirection) => {
    switch(dir) {
      case 'top':
        return {
          enter: 'transform ease-out duration-300 transition',
          enterFrom: 'translate-y-2 opacity-0 sm:translate-y-0',
          enterTo: 'translate-y-0 opacity-100',
          leave: 'transition ease-in duration-100',
          leaveFrom: 'opacity-100',
          leaveTo: 'opacity-0',
        }
      case 'bottom':
        return {
          enter: 'transform ease-out duration-300 transition',
          enterFrom: '-translate-y-2 opacity-0 sm:-translate-y-0',
          enterTo: '-translate-y-0 opacity-100',
          leave: 'transition ease-in duration-100',
          leaveFrom: 'opacity-100',
          leaveTo: 'opacity-0',
        }
      case 'middle':
        return {
          enter: 'transform ease-out duration-300 transition',
          enterFrom: 'opacity-0 scale-95',
          enterTo: 'opacity-100 scale-100',
          leave: 'transition ease-in duration-100',
          leaveFrom: 'opacity-100 scale-100',
          leaveTo: 'opacity-0 scale-95',
        }
      default:
        return {}
    }
  }

  return (
    <Transition
      show={show}
      as="div"
      ref={itemRef}
      className="pointer-events-auto max-w-sm overflow-hidden rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 my-2"
      style={{ zIndex: zIndex }}
      {...getTransitionClasses(direction)}
    >
      <div className="p-4">
        <div className="flex items-center">
          {IconComponent && (
            <div className="shrink-0">
              <IconComponent aria-hidden="true" className={`size-6 ${iconColor}`} />
            </div>
          )}
          <div className={`flex-1 min-w-0 ${IconComponent ? 'ml-3' : ''}`}>
            <p className={`text-sm font-medium ${type === 'text' ? typeColorMap.text : 'text-gray-900 dark:text-gray-100'}`}>{content}</p>
          </div>
        </div>
      </div>
    </Transition>
  )
}
