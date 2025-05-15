'use client'

import { useEffect, useState } from "react";
import { eventOn } from "@/lib/events";
import { nextZIndex } from "@dootask/tools";
import { uuidv4 } from "@/lib/utils";
import AlertItem from "./alert-item";

export interface AlertProps {
  type: "success" | "warning" | "error" | "prompt" | "close"
  title: string
  description?: string

  placeholder?: string  // prompt type only
  defaultValue?: string  // prompt type only
  buttonText?: string  // prompt type only

  showCancel?: boolean
  showConfirm?: boolean  // Invalid for prompt type

  closeOnClickMask?: boolean
  zIndex?: number

  onConfirm?: (value?: string) => void | Promise<void>
  onCancel?: () => void

  __closeIng?: boolean
}

export interface AlertItem extends AlertProps {
  id: string
  afterClose: () => void
}

export default function AlertPortal() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    const off = eventOn("alert", (args: unknown) => {
      const item = args as AlertItem
      if (item.__closeIng) {
        setAlerts(prev => prev.map(alert => 
          alert.id === item.id ? {...alert, __closeIng: true} : alert
        ))
        return;
      }
      item.id = item.id ?? uuidv4()
      item.type = item.type ?? "success"
      item.showCancel = item.showCancel ?? true
      item.showConfirm = item.showConfirm ?? true
      item.closeOnClickMask = item.closeOnClickMask ?? (item.type !== 'prompt')
      item.zIndex = item.zIndex ?? (nextZIndex()+ 500)
      item.afterClose = () => setAlerts(prev => prev.filter(({id}) => id !== item.id))
      setAlerts(prev => [...prev, item])
    })
    return () => {
      off()
    }
  }, [])

  return (
    <>
      {alerts.map((alert) => (
        <AlertItem key={alert.id} {...alert} />
      ))}
    </>
  )
}
