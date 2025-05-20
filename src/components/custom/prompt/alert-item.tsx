'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { CheckIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { __AlertItem } from "@/components/custom/prompt/alert.tsx";

export default function AlertItem({type, title, description, placeholder, defaultValue, buttonText, showCancel, showConfirm, closeOnClickMask, zIndex, onConfirm, onCancel, afterClose, __closeIng}: __AlertItem) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const divRef = useRef<HTMLDivElement>(null)

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      setConfirmLoading(true)
      Promise.resolve(onConfirm(inputRef.current?.value ?? '')).then(() => {
        setOpen(false)
      }).finally(() => {
        setConfirmLoading(false)
      })
    } else {
      setOpen(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    setOpen(false)
  }

  const handleClose = useCallback(() => {
    if (!closeOnClickMask) {
      return
    }
    setOpen(false)
  }, [closeOnClickMask])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (!open) {
      timer = setTimeout(() => {
        afterClose()
      }, 3000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [open, afterClose])

  useEffect(() => {
    if (__closeIng) {
      handleClose()
    }
  }, [__closeIng, handleClose])

  useEffect(() => {
    setOpen(true)
  }, [])

  return (
    <Dialog open={open} onClose={handleClose} className="relative" style={{zIndex: zIndex}} initialFocus={divRef}>
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div ref={divRef} className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
          {type === 'prompt' ? (
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 w-4/5 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className='flex items-start justify-between gap-2'>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                {showCancel && (
                  <button
                    type="button"
                    className="text-gray-300 hover:text-gray-500 transition-colors duration-200 cursor-pointer"
                    onClick={handleCancel}
                  >
                    <XMarkIcon aria-hidden="true" className="size-4.5"/>
                  </button>
                )}
              </div>
              {description && (
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>{description}</p>
                </div>
              )}
              <div className="mt-5 mb-0.5 sm:flex sm:items-center">
                <div className="w-full">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    defaultValue={defaultValue}
                    className="block w-full rounded-md bg-transparent px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-[color,box-shadow] outline-none border-input border focus:border-ring focus:ring-ring/50 focus:ring-[3px] sm:text-sm/6"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-3 shrink-0 inline-flex w-full items-center justify-center rounded-md bg-mantis-400 transition-colors px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-mantis-350 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mantis-300 sm:mt-0 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleConfirm}
                  disabled={confirmLoading}
                >
                  {confirmLoading ? (
                    <Loader2 className="animate-spin mr-2" size={16}/>
                  ) : null}
                  {buttonText || t('common.confirm')}
                </button>
              </div>
            </DialogPanel>
          ) : (
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className={`mx-auto flex size-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-7 text-white ${
                  type === 'success' ? 'bg-mantis-400' :
                    type === 'warning' ? 'bg-amber-400' :
                      'bg-coral-400'
                }`}>
                  {type === 'success' && (
                    <CheckIcon aria-hidden="true" className="size-4.5"/>
                  )}
                  {type === 'warning' && (
                    <ExclamationTriangleIcon aria-hidden="true" className="size-4.5"/>
                  )}
                  {type === 'error' && (
                    <XMarkIcon aria-hidden="true" className="size-4.5"/>
                  )}
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle as="h3" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                {showConfirm && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirmLoading}
                    className={`flex items-center w-full min-w-24 justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-xs sm:ml-4 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed ${
                      type === 'success' ? 'bg-mantis-400 hover:bg-mantis-350' :
                        type === 'warning' ? 'bg-amber-400 hover:bg-amber-350' :
                          'bg-coral-400 hover:bg-coral-350'
                    }`}
                  >
                    {confirmLoading ? (
                      <Loader2 className="animate-spin mr-2" size={16}/>
                    ) : null}
                    {t('common.confirm')}
                  </button>
                )}
                {showCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="mt-3 inline-flex w-full min-w-24 justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-200 ring-inset hover:bg-gray-100 sm:mt-0 sm:w-auto"
                  >
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </DialogPanel>
          )}
          <span className="hidden" role="app-store-close" role-index={zIndex}></span>
        </div>
      </div>
    </Dialog>
  )
}
