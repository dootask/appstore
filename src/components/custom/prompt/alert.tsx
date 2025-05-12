'use client'

import {useEffect, useState} from "react";
import {eventOn} from "@/lib/events";
import {nextZIndex} from "@dootask/tools";
import {uuidv4} from "@/lib/utils";
import AlertItem from "./alert-item";

export interface AlertProps {
  type: "success" | "warning" | "error"
  title: string
  description: string
  showCancel?: boolean
  showConfirm?: boolean
  zIndex?: number
  onConfirm?: () => void
  onCancel?: () => void
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
      item.id = item.id ?? uuidv4()
      item.type = item.type ?? "success"
      item.showCancel = item.showCancel ?? true
      item.showConfirm = item.showConfirm ?? true
      item.zIndex = item.zIndex ?? nextZIndex()
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
