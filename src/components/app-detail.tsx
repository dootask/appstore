import type { AppItem, AppStatus } from "@/types/app"
import type { AppLogRef } from "@/components/app-log.tsx"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { ExternalLink, Loader2, LoaderCircle, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next";
import { requestAPI } from "@dootask/tools";
import { useEffect, useState, useRef } from "react";
import { Skeleton } from "./ui/skeleton";
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight as SyntaxStyle } from 'react-syntax-highlighter/dist/esm/styles/prism'
import "@/styles/github-markdown-light.css"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AppLog } from "@/components/app-log.tsx";
import { eventOn } from "@/lib/events";
import { useAppStore } from "@/lib/store.ts";

interface AppDetailProps {
  appName: string
  onInstall: (app: AppItem) => void
  onUninstall: (app: AppItem) => void
}

export function AppDetail({appName, onInstall, onUninstall}: AppDetailProps) {
  const {t} = useTranslation()
  const {updateOrAddApp, apps} = useAppStore();
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("detail")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const appLogRef = useRef<AppLogRef>(null)
  const app = apps.find(app => app.name === appName)

  if (!app) {
    return <div>App not found</div>
  }

  useEffect(() => {
    requestAPI({
      url: 'apps/info',
      data: {
        app_name: appName
      }
    }).then(({data}) => {
      if (data && data.name === appName) {
        updateOrAddApp(data)
      }
    }).catch((err) => {
      console.error(err)
    }).finally(() => {
      setLoading(false)
    })
    const off = eventOn("refreshLog", (app_name: unknown) => {
      if (app_name === appName) {
        handleRefreshLog()
      }
    })
    return () => {
      off()
    }
  }, [appName]);

  const handleRefreshLog = () => {
    setActiveTab('log')
    appLogRef.current?.fetchLogs()
  }

  return (
    <div className="flex-1 h-0 flex flex-col">
      {/* 顶部信息区 */}
      <div className="mx-6 mb-6 flex items-center justify-between">
        <div className="flex flex-1 items-start gap-4 mr-4">
          <img src={app.info.icon} alt={app.info.name} className="w-16 h-16 rounded-lg object-cover"/>
          <div className="min-h-16 flex flex-col justify-center select-text">
            <div className="text-2xl font-bold mb-1">{app.info.name}</div>
            <div className="text-gray-500 text-sm mb-1">{app.info.description}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-5 min-w-[120px]">
          <div className="flex flex-wrap justify-end gap-3">
            {app.config.status === 'installed' && (
              <Button
              className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg px-6 py-2 font-semibold cursor-pointer"
                onClick={() => {
                  onUninstall(app)
                }}
              >
                {t('app.uninstall')}
              </Button>
            )}
            {(() => {
              const statusConfig: Record<AppStatus, { className: string; loading: boolean; text: string }> = {
                installing: {
                  className: "bg-blue-100 text-blue-700 hover:bg-blue-200",
                  loading: true,
                  text: 'installing'
                },
                installed: {
                  className: "bg-green-100 text-green-700 hover:bg-green-200",
                  loading: false,
                  text: 'reinstall'
                },
                uninstalling: {
                  className: "bg-orange-100 text-orange-700 hover:bg-orange-200",
                  loading: true,
                  text: 'uninstalling'
                },
                not_installed: {
                  className: "bg-green-100 text-green-700 hover:bg-green-200",
                  loading: false,
                  text: 'install'
                },
                error: {
                  className: "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  loading: false,
                  text: 'error'
                }
              }

              const config = statusConfig[app.config.status] || statusConfig.not_installed
              if (app.upgradeable) {
                Object.assign(config, {
                  className: "bg-purple-100 text-purple-700 hover:bg-purple-200",
                  text: 'upgrade'
                })
              }

              return (
                <Button
                  className={`${config.className} rounded-lg px-6 py-2 font-semibold cursor-pointer relative`}
                  onClick={() => {
                    if (config.loading) {
                      handleRefreshLog()
                    } else {
                      onInstall(app)
                    }
                  }}
                >
                  {config.loading && (
                    <Loader2 className="animate-spin"/>
                  )}
                  {t('app.' + config.text)}
                  {app.upgradeable && (
                    <div className="absolute -top-1 -right-1 size-2.5 bg-red-500 rounded-full"></div>
                  )}
                </Button>
              )
            })()}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {app.info.website && (
              <a href={app.info.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                {t('common.website')} <ExternalLink size={14}/>
              </a>
            )}
            {app.info.document && (
              <a href={app.info.document} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                {t('common.document')} <ExternalLink size={14}/>
              </a>
            )}
            {app.info.github && (
              <a href={app.info.github} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                {t('common.open_community')} <ExternalLink size={14}/>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 分割线 */}
      <div className="mx-6 mb-3 border-b border-gray-200"/>

      {/* 详情、日志 */}
      <Tabs defaultValue="detail" value={activeTab} className="flex-1 flex flex-col h-0" onValueChange={setActiveTab}>
        <div className="mx-6 mb-4 flex items-center gap-2">
          <TabsList>
            <TabsTrigger className="px-4" value="detail">{t('label.detail')}</TabsTrigger>
            <TabsTrigger className="px-4" value="log">
              <div className="flex items-center gap-2">
                <div>{t('label.log')}</div>
                {activeTab === 'log' && (
                  <div className=" text-gray-500 hover:text-gray-700 -mr-0.5 cursor-pointer" onClick={handleRefreshLog}>
                    {isRefreshing ? <LoaderCircle className="!w-3.5 !h-3.5 animate-spin"/> : <RefreshCw className="!w-3.5 !h-3.5"/>}
                  </div>
                )}
              </div>
            </TabsTrigger>
          </TabsList>
        </div>
        {/* 详情内容 */}
        <TabsContent value="detail" className="flex-1 h-0">
          <ScrollArea className="h-full">
            <div className="px-6 pb-6 select-text">
              {loading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-[80%]"/>
                  <Skeleton className="h-4 w-[70%]"/>
                  <Skeleton className="h-4 w-[40%]"/>
                </div>
              ) : (
                app.document ? (
                  <div className="flex w-full">
                    <div className="flex-1 w-0 prose app-markdown-body">
                      <ReactMarkdown
                        children={app.document}
                        components={{
                          code(props) {
                            const {children, className, ...rest} = props
                            const match = /language-(\w+)/.exec(className || '')
                            return match ? (
                              <SyntaxHighlighter
                                PreTag="div"
                                children={String(children).replace(/\n$/, '')}
                                language={match[1]}
                                style={SyntaxStyle}
                              />
                            ) : (
                              <code {...rest} className={className}>
                                {children}
                              </code>
                            )
                          },
                          a(props) {
                            const {children, ...rest} = props
                            return (
                              <a {...rest} target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            )
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-4">
                    {t('app.no_document')}
                  </div>
                )
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        {/* 日志内容 */}
        <TabsContent value="log" className="flex-1 h-0">
          <ScrollArea className="h-full">
            <div className="px-6 pb-6 select-text">
              <AppLog ref={appLogRef} appName={appName} onLoading={setIsRefreshing}/>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
