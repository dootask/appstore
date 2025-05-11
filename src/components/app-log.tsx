import {requestAPI} from "@dootask/tools";
import {useEffect, useState, useRef, forwardRef, useImperativeHandle} from "react";
import {Skeleton} from "./ui/skeleton";
import {useTranslation} from "react-i18next";
import {ScrollArea} from "./ui/scroll-area";
import type {AppItem} from "@/types/app.ts";
import { Notice } from "./common";

interface AppLogProps {
  app: AppItem
  onLoading?: (loading: boolean) => void
}

export interface AppLogRef {
  fetchLogs: (isQueue?: boolean) => Promise<void>
}

export const AppLog = forwardRef<AppLogRef, AppLogProps>(({app, onLoading}, ref) => {
  const {t} = useTranslation()
  const [loading, setLoading] = useState(true)
  const [logDetail, setLogDetail] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const isRequestingRef = useRef(false)
  const [lastRequestTime, setLastRequestTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>(null)

  const fetchLogs = async (isQueue = true) => {
    if (isRequestingRef.current) return

    const now = Date.now()
    try {
      isRequestingRef.current = true
      setLoading(true)
      onLoading?.(true)
      const {data} = await requestAPI({
        url: 'apps/logs',
        data: {
          app_name: app.name
        }
      })
      if (data && data.name === app.name) {
        // 如果状态发生变化，则通知用户
        if (data.local.status !== app.local.status) {
          if (data.local.status === 'installing') {
            Notice({
              type: "info",
              title: app.info.name,
              description: t('install.install_starting'),
            })
          } else if (data.local.status === 'installed') {
            Notice({
              type: "success",
              title: app.info.name,
              description: t('install.install_success'),
            })
          } else if (data.local.status === 'error') {
            Notice({
              type: "error",
              title: app.info.name,
              description: t('install.install_failed')
            })
          }
        }
        // 更新应用状态
        Object.assign(app, {local: data.local})
        setLogDetail(data.log)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLastRequestTime(Date.now())
      setTimeout(() => {
        setLoading(false)
        onLoading?.(false)
        isRequestingRef.current = false
      }, isQueue ? 500 - (Date.now() - now) : 0)
    }
  }

  useImperativeHandle(ref, () => ({
    fetchLogs
  }))

  useEffect(() => {
    // 设置定时器
    timerRef.current = setInterval(() => {
      const requiredTime = ['installing', 'uninstalling'].includes(app.local.status) ? 3000 : 15000
      if (Date.now() - lastRequestTime > requiredTime) {
        fetchLogs(false)
      }
    }, 3000)

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [lastRequestTime]);

  useEffect(() => {
    // 初始加载
    fetchLogs(false)
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({behavior: "instant"});
    }
  }, [logDetail]);

  return (
    <ScrollArea className="h-full">
      <div className="select-text">
        {loading && logDetail == "" ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-[80%]"/>
            <Skeleton className="h-4 w-[70%]"/>
            <Skeleton className="h-4 w-[40%]"/>
          </div>
        ) : (
          logDetail ? (
            <pre><code>{logDetail}</code></pre>
          ) : (
            <div className="text-sm text-gray-500 mb-4">{t('app.no_log')}</div>
          )
        )}
      </div>
      <div ref={bottomRef}></div>
    </ScrollArea>
  )
})
