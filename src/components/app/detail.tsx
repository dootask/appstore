import type { App, AppStatus } from "@/types/api"
import type { AppLogRef } from "@/components/app/log.tsx"
import { Button } from "@/components/ui/button.tsx"
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { ExternalLink, Loader2, LoaderCircle, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { darcula as SyntaxStyle } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { AppLog } from "@/components/app/log.tsx";
import { eventOn } from "@/lib/events.ts";
import { useAppStore } from "@/store/app";
import { AppApi } from "@/lib";

interface AppDetailProps {
  appId: string
  onInstall: (app: App) => void
  onUninstall: (app: App) => void
}

export function AppDetail({appId, onInstall, onUninstall}: AppDetailProps) {
  const {t} = useTranslation()
  const {updateOrAddApp, apps} = useAppStore();
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("detail")
  const [appReadme, setAppReadme] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const appLogRef = useRef<AppLogRef>(null)
  const app = apps.find(app => app.id === appId)

  if (!app) {
    return <div>App not found</div>
  }

  useEffect(() => {
    AppApi.getAppReadme(appId).then(({data}) => {
      if (data) {
        setAppReadme(data.content)
      }
    }).catch((err) => {
      console.error(err)
    }).finally(() => {
      setLoading(false)
    })
    const off = eventOn("refreshLog", (value: unknown) => {
      if (appId === value) {
        handleRefreshLog()
      }
    })
    return () => {
      off()
    }
  }, [appId, updateOrAddApp]);

  const handleRefreshLog = () => {
    setActiveTab('log')
    appLogRef.current?.fetchLogs()
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部信息区 */}
      <div className="mx-6 mb-6 flex items-center justify-between">
        <div className="flex flex-1 items-start gap-4 mr-4">
          <img src={app.icon} alt={app.name} className="w-16 h-16 rounded-lg object-cover"/>
          <div className="min-h-16 flex flex-col justify-center select-text">
            <div className="text-2xl text-gray-700 dark:text-gray-100 font-bold mb-1">{app.name}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">{app.description}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-5 min-w-[120px]">
          <div className="flex flex-wrap justify-end gap-3">
            {app.config.status === 'installed' && (
              <Button
                className="bg-amber-400 text-white hover:bg-amber-350 rounded-lg px-6 py-2 font-semibold cursor-pointer"
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
                  className: "bg-ocean-400 text-white hover:bg-ocean-350",
                  loading: true,
                  text: 'installing'
                },
                installed: {
                  className: "bg-mantis-400 text-white hover:bg-mantis-350",
                  loading: false,
                  text: 'reinstall'
                },
                uninstalling: {
                  className: "bg-amber-400 text-white hover:bg-amber-350",
                  loading: true,
                  text: 'uninstalling'
                },
                not_installed: {
                  className: "bg-mantis-400 text-white hover:bg-mantis-350",
                  loading: false,
                  text: 'install'
                },
                error: {
                  className: "bg-coral-400 text-white hover:bg-coral-350",
                  loading: false,
                  text: 'error'
                }
              }

              const config = statusConfig[app.config.status] || statusConfig.not_installed
              if (app.upgradeable) {
                Object.assign(config, {
                  className: "bg-lavender-400 text-white hover:bg-lavender-350",
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
            {app.website && (
              <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                {t('common.website')} <ExternalLink size={14}/>
              </a>
            )}
            {app.document && (
              <a href={app.document} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                {t('common.document')} <ExternalLink size={14}/>
              </a>
            )}
            {app.github && (
              <a href={app.github} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                {t('common.open_community')} <ExternalLink size={14}/>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 分割线 */}
      <div className="mx-6 mb-4 border-b border-gray-200 dark:border-zinc-700"/>

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
                appReadme ? (
                  <div className="flex w-full">
                    <div className="flex-1 w-0 prose app-markdown-body">
                      <ReactMarkdown
                        children={appReadme}
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
                                customStyle={{
                                  padding: 'var(--base-size-16)',
                                  margin: 'calc(var(--base-size-16) * -1)',
                                  backgroundColor: '#151b23',
                                }}
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
              <AppLog ref={appLogRef} appId={appId} onLoading={setIsRefreshing}/>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
