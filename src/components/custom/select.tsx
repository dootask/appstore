'use client'

import { useState } from 'react'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { CheckIcon } from '@heroicons/react/20/solid'

export interface SelectOption {
  id: string
  name: string
}

export interface SelectProps {
  options: SelectOption[]
  defaultValue?: string
  onChange?: (value: SelectOption) => void
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
        <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left text-gray-900 transition-[color,box-shadow] sm:text-sm/6 outline-none border-input border focus:border-ring focus:ring-ring/50 focus:ring-[3px]" {...props}>
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

        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.id}
              value={option}
              className="group relative cursor-default py-2 pr-9 pl-3 text-gray-800 select-none data-focus:bg-gray-100 data-focus:outline-hidden"
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
