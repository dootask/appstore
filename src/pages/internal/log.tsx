import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/app";
import { InternalApi } from "@/lib";

interface AppLogProps {
  appId: string
  onLoading?: (loading: boolean) => void
}

export interface AppLogRef {
  fetchLogs: (isQueue?: boolean) => Promise<void>
}

export const AppLog = forwardRef<AppLogRef, AppLogProps>(({appId, onLoading}, ref) => {
  const {t} = useTranslation()
  const {apps} = useAppStore();
  const app = apps.find(app => app.id === appId)
  const [loading, setLoading] = useState(true)
  const [logDetail, setLogDetail] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const isRequestingRef = useRef(false)
  const [lastRequestTime, setLastRequestTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>(null)

  if (!app) {
    return <div>App not found</div>
  }

  const fetchLogs = async (isQueue = true) => {
    if (isRequestingRef.current) return

    const now = Date.now()
    try {
      isRequestingRef.current = true
      setLoading(true)
      onLoading?.(true)
      const {data} = await InternalApi.getAppLog(appId)
      if (data) {
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
      const requiredTime = ['installing', 'uninstalling'].includes(app.config.status) ? 3000 : 15000
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
    <>
      {loading && logDetail == "" ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-[80%]"/>
          <Skeleton className="h-4 w-[70%]"/>
          <Skeleton className="h-4 w-[40%]"/>
        </div>
      ) : (
        logDetail ? (
          <div className="flex w-full">
            <div className="flex-1 w-0 prose">
              <pre className="overflow-auto"><code>{logDetail}</code></pre>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 mb-4">{t('app.no_log')}</div>
        )
      )}
      <div ref={bottomRef}></div>
    </>
  )
})
