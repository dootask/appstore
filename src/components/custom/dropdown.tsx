import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Check, Ellipsis } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useFloating, autoUpdate, offset, flip, shift, useInteractions, useHover, useFocus, size } from '@floating-ui/react'
import { cn } from "@/lib/utils.ts";

export interface DropdownItem {
  value: string
  label: string
  divider?: boolean
}

export interface DropdownProps {
  options: DropdownItem[]
  defaultValue?: string
  className?: string
  children?: ReactNode;
  onChange?: (value: string) => void
}

export default function Dropdown({options, defaultValue, className, onChange, children, ...props}: DropdownProps) {
  // 状态管理
  const [items, setItems] = useState<DropdownItem[][]>([])
  
  // 处理选项分组
  useEffect(() => {
    const groups = options.reduce((acc: DropdownItem[][], option: DropdownItem) => {
      if (option.divider || acc.length === 0) {
        acc.push([option])
      } else {
        acc[acc.length - 1].push(option)
      }
      return acc
    }, [])
    setItems(groups)
  }, [options])

  // 配置 Floating UI
  const {
    x, 
    y, 
    strategy, 
    placement, 
    refs,
    context
  } = useFloating({
    placement: 'bottom-start',
    middleware: [
      offset(8), // 设置偏移量
      flip(), // 自动翻转
      shift(), // 防止溢出视口
      size({
        apply({ availableWidth, availableHeight, elements }) {
          // 确保下拉菜单不会超出可视区域
          Object.assign(elements.floating.style, {
            maxWidth: `${availableWidth}px`,
            maxHeight: `${availableHeight}px`,
          });
        },
        padding: 8, // 与边缘保持 8px 的安全距离
      }),
    ],
    whileElementsMounted: autoUpdate // 自动更新位置
  });

  // 添加交互行为
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false }),
    useFocus(context)
  ]);

  // 处理选择变更
  const handleChange = (value: string) => {
    onChange?.(value)
  }

  // 确定变换原点
  const getOrigin = () => {
    if (placement.includes('top')) return 'origin-bottom';
    if (placement.includes('bottom')) return 'origin-top';
    if (placement.includes('left')) return 'origin-right';
    if (placement.includes('right')) return 'origin-left';
    return 'origin-top';
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      {/* 菜单触发按钮 */}
      <MenuButton 
        ref={refs.setReference}
        className={cn(
          'flex items-center rounded-full text-gray-400 hover:text-gray-600 focus:outline-hidden',
          className
        )} 
        {...getReferenceProps()}
        {...props}
      >
        {children ? children : <Ellipsis aria-hidden="true" className="size-5"/>}
      </MenuButton>

      {/* 菜单内容 */}
      <MenuItems
        ref={refs.setFloating}
        style={{
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          width: 'var(--radix-dropdown-menu-content-width)',
        }}
        {...getFloatingProps()}
        transition
        className={cn(
          "z-50 min-w-40 max-w-56 divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in overflow-auto",
          getOrigin()
        )}
      >
        <div className="py-2">
          {items.map((group, index) => (
            <div key={index}>
              {group.map((item, itemIndex) => (
                <MenuItem key={itemIndex}>
                  {({active}) => (
                    <div 
                      className={cn(
                        "flex items-center px-4 py-2 text-sm cursor-pointer max-w-full overflow-hidden whitespace-nowrap text-ellipsis",
                        active ? "bg-gray-100 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100" : "text-gray-700 dark:text-zinc-300",
                      )}
                      onClick={() => handleChange(item.value)}
                    >
                      {item.label}
                      {(defaultValue && defaultValue === item.value) && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </div>
                  )}
                </MenuItem>
              ))}
            </div>
          ))}
        </div>
      </MenuItems>
    </Menu>
  )
}
