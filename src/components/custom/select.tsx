'use client'

import { useState } from 'react'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { CheckIcon } from '@heroicons/react/20/solid'

/**
 * 下拉选择组件 - 基于 Headless UI 的 Listbox 组件封装
 * 
 * 提供美观的下拉选择界面，支持默认值、占位符、自定义样式等功能。
 * 支持键盘导航和屏幕阅读器。
 * 
 * @example
 * ```tsx
 * // 基本用法
 * const options = [
 *   { id: '1', name: '选项1' },
 *   { id: '2', name: '选项2' }
 * ]
 * 
 * <Select 
 *   options={options}
 *   defaultValue="1"
 *   onChange={(value) => console.log(value)}
 *   placeholder="请选择"
 * />
 * 
 * // 受控用法
 * const [value, setValue] = useState(options[0])
 * 
 * <Select 
 *   options={options}
 *   defaultValue={value.id}
 *   onChange={setValue}
 * />
 * ```
 */

export interface SelectOption {
  /** 选项的唯一标识 */
  id: string
  /** 选项的显示文本 */
  name: string
}

export interface SelectProps {
  /** 选项列表 */
  options: SelectOption[]
  /** 默认选中的选项ID */
  defaultValue?: string
  /** 选择改变时的回调函数 */
  onChange?: (value: SelectOption) => void
  /** 未选择时的占位文本 */
  placeholder?: string
}

export default function Select({options, defaultValue, onChange, placeholder = '', ...props}: SelectProps) {
  const [selected, setSelected] = useState<SelectOption>(options.find(option => option.id === defaultValue) || {id: '', name: ''})

  const handleChange = (value: SelectOption) => {
    setSelected(value)
    onChange?.(value)
  }

  return (
    <Listbox value={selected} onChange={handleChange}>
      <div className="relative">
        {/* 按钮 */}
        <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-background py-1.5 pr-2 pl-3 text-left text-gray-900 dark:text-gray-100 transition-[color,box-shadow] sm:text-sm/6 outline-none border-input border focus:border-ring focus:ring-ring/50 focus:ring-[3px]" {...props}>
          {selected.name ? (
            <span className="col-start-1 row-start-1 truncate pr-6">{selected.name}</span>
          ) : (
            <span className="col-start-1 row-start-1 truncate pr-6 text-gray-500">{placeholder}</span>
          )}
          <ChevronUpDownIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4"
          />
        </ListboxButton>

        {/* 选项列表 */}
        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-background dark:border dark:border-zinc-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.id}
              value={option}
              className="group relative cursor-default py-2 pr-9 pl-3 text-gray-800 dark:text-gray-100 select-none data-focus:bg-gray-100 dark:data-focus:bg-zinc-800 data-focus:outline-hidden"
            >
              <span className="block truncate font-normal group-data-selected:font-medium">{option.name}</span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-600 group-not-data-selected:hidden">
                <CheckIcon aria-hidden="true" className="size-5"/>
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
