'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Transition } from '@headlessui/react'
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { type NoticeItem } from './notice'

export default function NoticeItem({type, title, description, showClose, zIndex, onClose, afterClose, duration, delayShow, __closeIng}: NoticeItem) {
  const [show, setShow] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const handleClose = useCallback(() => {
    setShow(false)
    onClose?.()
  }, [onClose])

  const handleClick = useCallback((e: MouseEvent) => {
    if (itemRef.current?.contains(e.target as Node)) {
      e.stopPropagation()
    }
    if (e.type === 'click' && closeRef.current?.contains(e.target as Node)) {
      handleClose()
    }
  }, [handleClose])

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
      timer = setTimeout(() => {
        afterClose()
      }, 3000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [show, afterClose])

  useEffect(() => {
    if (delayShow) {
      const timer = setTimeout(() => {
        setShow(true)
      }, delayShow)
      return () => clearTimeout(timer)
    } else {
      setShow(true)
    }
  }, [delayShow])

  useEffect(() => {
    if (__closeIng) {
      handleClose()
    }
  }, [__closeIng, handleClose])

  useEffect(() => {
    if (show) {
      window.addEventListener('pointerdown', handleClick, true)
      window.addEventListener('pointerup', handleClick, true)
      window.addEventListener('click', handleClick, true)
      return () => {
        window.removeEventListener('pointerdown', handleClick, true)
        window.removeEventListener('pointerup', handleClick, true)
        window.removeEventListener('click', handleClick, true)
      }
    }
  }, [show, handleClick])

  return (
    <>
      <div
        aria-live="assertive"
        className="w-full inset-0 flex items-end sm:items-start"
        style={{zIndex: zIndex}}
      >
        <div className="flex w-full flex-col items-center gap-y-3 sm:items-end">
          <Transition show={show}>
            <div ref={itemRef} className="pointer-events-auto w-full mb-4 sm:mb-6 max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5 transition data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:opacity-0 data-closed:data-enter:-translate-y-full data-closed:data-enter:sm:translate-y-0 data-closed:data-enter:sm:translate-x-full data-leave:duration-200 data-leave:ease-in data-leave:-translate-y-full data-leave:sm:translate-y-0 data-leave:sm:translate-x-full doo-dark:bg-gray-300 doo-dark:shadow-none">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="shrink-0">
                    {type === 'success' && (
                      <CheckCircleIcon aria-hidden="true" className="size-6 text-green-400"/>
                    )}
                    {type === 'warning' && (
                      <ExclamationCircleIcon aria-hidden="true" className="size-6 text-yellow-400"/>
                    )}
                    {type === 'error' && (
                      <XCircleIcon aria-hidden="true" className="size-6 text-red-400"/>
                    )}
                    {type === 'info' && (
                      <InformationCircleIcon aria-hidden="true" className="size-6 text-blue-400"/>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
                  </div>
                  {showClose && (
                    <div className="ml-4 flex shrink-0">
                      <button
                        ref={closeRef}
                        type="button"
                        className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500"
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon aria-hidden="true" className="size-5"/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </>
  )
}
