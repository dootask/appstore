import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Ellipsis } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { cn } from "@/lib/utils.ts";

export interface DropdownItem {
  value: string
  label: string
  divider?: boolean
}

export interface DropdownProps {
  options: DropdownItem[]
  slot?: ReactNode
  className?: string
  onChange?: (value: string) => void
}

export default function Dropdown({options, slot, className, onChange, ...props}: DropdownProps) {
  const [items, setItems] = useState<DropdownItem[][]>([])

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

  const handleChange = (value: string) => {
    onChange?.(value)
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton className={cn(
        'flex items-center rounded-full text-gray-400 hover:text-gray-600 focus:outline-hidden',
        className
      )} {...props}>
        {slot || <Ellipsis aria-hidden="true" className="size-5"/>}
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-10 mt-2 min-w-40 max-w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        {items.map((group, index) => (
          <div key={index} className="py-1">
            {group.map((item, itemIndex) => (
              <MenuItem key={itemIndex}>
                <div className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden max-w-full overflow-hidden whitespace-nowrap text-ellipsis" onClick={() => handleChange(item.value)}>
                  {item.label}
                </div>
              </MenuItem>
            ))}
          </div>
        ))}
      </MenuItems>
    </Menu>
  )
}
