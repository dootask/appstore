'use client'

import { type ReactNode, memo, useRef } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { nextZIndex } from '@dootask/tools'

/**
 * 抽屉组件 - 从屏幕边缘滑入的面板
 * 
 * 支持从四个方向（左、右、上、下）滑入，带有平滑的动画效果和背景遮罩。
 * 
 * @example
 * ```tsx
 * // 基本用法
 * <Drawer open={isOpen} onOpenChange={setIsOpen}>
 *   <div>抽屉内容</div>
 * </Drawer>
 * 
 * // 从左侧打开
 * <Drawer direction="left" title="左侧抽屉">
 *   <div>左侧抽屉内容</div>
 * </Drawer>
 * 
 * // 从底部打开，不显示关闭按钮
 * <Drawer direction="bottom" showCloseButton={false}>
 *   <div>底部抽屉内容</div>
 * </Drawer>
 * ```
 */

// 标题组件
const DrawerTitle = memo(function DrawerTitle({title}: { title?: ReactNode }) {
  if (!title) return null

  return (
    <div className="p-4 sm:px-6">
      <DialogTitle className="text-base font-semibold text-gray-900 dark:text-zinc-100">
        {title}
      </DialogTitle>
    </div>
  )
})

// 内容组件
const DrawerContent = memo(function DrawerContent({children}: { children?: ReactNode }) {
  return (
    <div className="relative flex-1 h-0">
      {children}
    </div>
  )
})

// 关闭按钮组件
const CloseButton = memo(function CloseButton({dismissible, onOpenChange}: {
  dismissible: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!dismissible) return null

  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className="w-full h-full flex items-center justify-center rounded-full text-white transition-transform duration-300 ease-out hover:-rotate-90 cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" fill="none" className="w-6 h-6">
        <path d="M8.28596 6.51819C7.7978 6.03003 7.00634 6.03003 6.51819 6.51819C6.03003 7.00634 6.03003 7.7978 6.51819 8.28596L11.2322 13L6.51819 17.714C6.03003 18.2022 6.03003 18.9937 6.51819 19.4818C7.00634 19.97 7.7978 19.97 8.28596 19.4818L13 14.7678L17.714 19.4818C18.2022 19.97 18.9937 19.97 19.4818 19.4818C19.97 18.9937 19.97 18.2022 19.4818 17.714L14.7678 13L19.4818 8.28596C19.97 7.7978 19.97 7.00634 19.4818 6.51819C18.9937 6.03003 18.2022 6.03003 17.714 6.51819L13 11.2322L8.28596 6.51819Z" fill="currentColor"></path>
      </svg>
    </button>
  )
})

export interface DrawerProps {
  /** 控制抽屉是否打开 */
  open: boolean
  /** 抽屉状态改变时的回调函数 */
  onOpenChange: (open: boolean) => void
  /** 抽屉标题 */
  title?: ReactNode
  /** 抽屉内容 */
  children?: ReactNode
  /** 自定义类名 */
  className?: string
  /** 抽屉打开方向 */
  direction?: 'left' | 'right' | 'bottom' | 'top'
  /** 是否可关闭（点击背景遮罩时） */
  dismissible?: boolean
  /** 是否显示背景遮罩 */
  showBackdrop?: boolean
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean
  /** 自定义层级 */
  zIndex?: number
}

export default function Drawer({open, onOpenChange, title, children, className, direction = 'right', dismissible = true, showBackdrop = true, showCloseButton = true, zIndex}: DrawerProps) {
  const currentZIndex = zIndex || nextZIndex()
  const divRef = useRef<HTMLDivElement>(null)

  // 统一定义各方向的样式
  const containerStyles = {
    right: 'inset-y-0 right-0 pl-10 max-w-full',
    left: 'inset-y-0 left-0 pr-10 max-w-full',
    bottom: 'inset-x-0 bottom-0 pt-10 max-h-full',
    top: 'inset-x-0 top-0 pb-10 max-h-full'
  }

  const panelStyles = {
    right: 'w-screen max-w-md data-closed:translate-x-2/5 data-closed:opacity-0',
    left: 'w-screen max-w-md data-closed:-translate-x-2/5 data-closed:opacity-0',
    bottom: 'h-screen max-h-[80vh] w-full data-closed:translate-y-2/5 data-closed:opacity-0',
    top: 'h-screen max-h-[80vh] w-full data-closed:-translate-y-2/5 data-closed:opacity-0'
  }

  const closeButtonStyles = {
    right: 'top-0 left-0 -ml-10',
    left: 'top-0 right-0 -mr-10',
    bottom: 'top-0 right-0 -mt-10',
    top: 'bottom-0 right-0 -mb-10'
  }

  return (
    <Dialog
      open={open}
      onClose={onOpenChange}
      className="relative"
      style={{zIndex: currentZIndex}}
      initialFocus={divRef}
    >
      {/* 背景遮罩 */}
      {showBackdrop && (
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 dark:bg-zinc-950/70 transition-opacity duration-300 ease-out data-closed:opacity-0"
          onClick={dismissible ? () => onOpenChange(false) : undefined}
        />
      )}

      <div ref={divRef} className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className={cn(
            "pointer-events-none fixed flex",
            containerStyles[direction as keyof typeof containerStyles]
          )}>
            <DialogPanel
              transition
              className={cn(
                "pointer-events-auto relative bg-white dark:bg-black transform transition duration-300 ease-out data-closed:ease-in-out will-change-transform",
                panelStyles[direction as keyof typeof panelStyles],
                className
              )}>

              {/* 外侧关闭按钮 */}
              {showCloseButton && (
                <TransitionChild>
                  <div className={cn(
                    "absolute w-10 h-10",
                    closeButtonStyles[direction as keyof typeof closeButtonStyles]
                  )}>
                    <CloseButton
                      dismissible={dismissible}
                      onOpenChange={onOpenChange}
                    />
                  </div>
                </TransitionChild>
              )}

              {/* 抽屉内容 */}
              <div className="flex h-full flex-col">
                <DrawerTitle title={title}/>
                <DrawerContent>{children}</DrawerContent>
              </div>
            </DialogPanel>
          </div>
          <span className="hidden" role="app-store-close" role-index={currentZIndex}></span>
        </div>
      </div>
    </Dialog>
  )
}
