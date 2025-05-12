'use client'

import {useEffect, useState} from 'react'
import {Dialog, DialogBackdrop, DialogPanel, DialogTitle} from '@headlessui/react'
import {CheckIcon, ExclamationTriangleIcon, XMarkIcon} from '@heroicons/react/24/outline'
import {Loader2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import type {AlertItem} from "@/components/custom/prompt/alert.tsx";

export default function AlertItem({type, title, description, showCancel, showConfirm, zIndex, onConfirm, onCancel, afterClose}: AlertItem) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      setConfirmLoading(true)
      Promise.resolve(onConfirm()).then(() => {
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
    setOpen(true)
  }, [])

  return (
    <Dialog open={open} onClose={setOpen} className="relative" style={{zIndex: zIndex}}>
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in doo-dark:bg-white/60"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        {open && (
          <div role="app-store-close" role-index={zIndex} className="hidden" onClick={handleCancel}></div>
        )}
        <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 doo-dark:bg-gray-300 doo-dark:shadow-none"
          >
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex size-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-7 text-white ${
                type === 'success' ? 'bg-green-600' :
                  type === 'warning' ? 'bg-yellow-500' :
                    'bg-red-600'
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
                <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
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
                  className={`flex items-center w-full min-w-24 justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-xs sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed ${
                    type === 'success' ? 'bg-green-600 hover:bg-green-500' :
                      type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-400' :
                        'bg-red-600 hover:bg-red-500'
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
                  className="mt-3 inline-flex w-full min-w-24 justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
