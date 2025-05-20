import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from "react-i18next";
import { props, backApp, interceptBack } from "@dootask/tools";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";
import { AppSearch } from '@/pages/internal/search';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppCard } from '@/pages/internal/card';
import { AppDetail } from "@/pages/internal/detail"
import { beforeClose } from "@/lib/utils.ts";
import { AppInstall } from '@/pages/internal/install';
import { Alert, Notice } from "@/components/custom/prompt";
import { useAppStore } from '@/store/app';
import Dropdown from "@/components/custom/dropdown.tsx";
import Drawer from "@/components/custom/drawer.tsx";
import type { App } from "@/types/api.ts";
import { InternalApi } from "@/lib";

const Internal = () => {
  const {t} = useTranslation();
  const {apps, loading, categories, fetchApps, fetchApp} = useAppStore();
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const [openInstall, setOpenInstall] = useState(false)
  const [filter, setFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hasUpgradeableApps, setHasUpgradeableApps] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null)
  const fetchTimerRef = useRef<NodeJS.Timeout>(null)
  const detailTimerRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    // 设置基本样式（在子应用中body的样式会丢失，所以需要手动设置）
    document.body.style.color = 'var(--foreground)';
    document.body.style.backgroundColor = 'var(--background)';
    // 获取应用列表数据
    fetchApps();
    // 拦截返回事件
    const off = interceptBack(() => {
      return beforeClose();
    })
    // 监听应用列表变化
    const handlers: { installer: [(() => void), string] | null, uninstaller: [(() => void), string] | null } = {installer: null, uninstaller: null}
    const unsubscribe = useAppStore.subscribe(
      ({apps}, {apps: prevApps}) => {
        apps.forEach(app => {
          const prevApp = prevApps.find(p => p.id === app.id);
          if (prevApp && prevApp.config.status !== app.config.status) {
            if (app.config.status === 'installing') {
              const installType = prevApp.upgradeable ? 'upgrade' : 'install'
              handlers.installer = [
                Notice({
                  type: "info",
                  title: t(`install.${installType}_title`),
                  description: t(`install.${installType}_starting`, {app: app.name}),
                }),
                installType
              ]
            } else if (app.config.status === 'installed') {
              const installType = handlers.installer?.[1] || 'install'
              if (handlers.installer) {
                handlers.installer[0]()
                handlers.installer = null
              }
              Notice({
                type: "success",
                title: t(`install.${installType}_title`),
                description: t(`install.${installType}_success`, {app: app.name}),
              })
            } else if (app.config.status === 'uninstalling') {
              handlers.uninstaller = [
                Notice({
                  type: "warning",
                  title: t('uninstall.title'),
                  description: t('uninstall.uninstall_starting', {app: app.name}),
                }),
                'uninstall'
              ]
            } else if (app.config.status === 'not_installed') {
              if (handlers.uninstaller) {
                handlers.uninstaller[0]()
                handlers.uninstaller = null
              }
              Notice({
                type: "success",
                title: t('uninstall.success'),
                description: t('uninstall.success_description', {app: app.name}),
              })
            } else if (app.config.status === 'error') {
              if (prevApp.config.status === 'installing') {
                if (handlers.installer) {
                  handlers.installer[0]()
                  Notice({
                    type: "error",
                    title: t(`install.${handlers.installer[1]}_title`),
                    description: t(`install.${handlers.installer[1]}_failed`, {app: app.name})
                  })
                  handlers.installer = null
                }
              }
            }
          }
        });
      }
    );
    // 清理函数
    return () => {
      off();
      unsubscribe();
    }
  }, [])

  useEffect(() => {
    // 检查是否有可升级的应用
    const hasUpgradeable = apps.some(app => app.upgradeable);
    setHasUpgradeableApps(hasUpgradeable);
    // 设置定时器
    let isFetching = false;
    fetchTimerRef.current = setInterval(async () => {
      if (isFetching) return;

      const waitIds = apps
        .filter(item => ['installing', 'uninstalling'].includes(item.config.status))
        .map(item => item.id);

      if (waitIds.length > 0) {
        isFetching = true;
        try {
          await fetchApps(true, waitIds);
        } finally {
          isFetching = false;
        }
      }
    }, 5000)
    // 清理定时器
    return () => {
      if (fetchTimerRef.current) {
        clearInterval(fetchTimerRef.current)
      }
    }
  }, [apps])

  useEffect(() => {
    // 如果当前选中的类别不在新的类别列表中，重置为 'all'
    if (selectedCategory !== 'all' && !categories.slice(0,5).includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory])

  useEffect(() => {
    if (!openDetail) {
      detailTimerRef.current = setTimeout(() => {
        setSelectedApp(null)
      }, 1000)
    }
    return () => {
      if (detailTimerRef.current) {
        clearTimeout(detailTimerRef.current)
      }
    }
  }, [openDetail])

  // 过滤应用列表
  const getFilteredApps = () => {
    let filtered = [...apps];

    // 按安装状态过滤
    if (filter === 'installed') {
      filtered = filtered.filter(app => app.config.status === 'installed');
    } else if (filter === 'upgradeable') {
      filtered = filtered.filter(app => app.upgradeable);
    }

    // 按类别过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(app => {
        const tags = app.tags || [];
        return tags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase());
      });
    }

    // 按搜索关键词过滤
    if (searchKeyword.trim() !== '') {
      const keyword = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(app => {
        return (
          app.name.toLowerCase().includes(keyword) ||
          app.description.toLowerCase().includes(keyword) ||
          (app.tags && app.tags.some(tag => tag.toLowerCase().includes(keyword)))
        );
      });
    }

    return filtered;
  };

  // 处理搜索
  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
  };

  // 打开应用详情
  const handleOpenApp = (app: App) => {
    setSelectedApp(app);
    setOpenDetail(true)
  }

  // 打开安装应用
  const handleInstall = (app: App) => {
    if (['installing', 'uninstalling'].includes(app.config.status)) {
      // 如果应用正在安装或卸载，则直接返回
      return;
    }
    setOpenInstall(true)
  }

  // 卸载应用
  const handleUninstall = (app: App) => {
    if (app.config.status !== 'installed') {
      // 如果应用未安装，则直接返回
      return;
    }
    Alert({
      type: "warning",
      title: t('uninstall.title'),
      description: t('uninstall.description', {app: app.name}),
      showCancel: true,
      onConfirm: async () => {
        // 确认卸载
        await InternalApi.uninstallApp(app.id).then(() => {
          // 卸载成功
          setOpenDetail(false);
          setOpenInstall(false);
          fetchApp(app.id);
        }).catch((error) => {
          // 卸载失败
          Alert({
            type: "warning",
            title: t('uninstall.error'),
            description: t('uninstall.error_description', {app: app.name, error: error.message || t('common.unknown_error')}),
            showCancel: false,
          })
        }).finally(() => {
          // 请求应用列表
          fetchApps();
        })
      }
    })
  }

  // 菜单项点击事件
  const handleMenuChange = (value: string) => {
    if (value === 'update_app_list') {
      // 更新应用列表
      const off = Notice({
        type: "text",
        title: t('install.updating_app_list'),
      })
      InternalApi.updateAppList().then(() => {
        Notice({
          type: "success",
          title: t('install.update_app_list_success'),
        })
        fetchApps();
      }).catch((error) => {
        Notice({
          type: "error",
          title: t('install.update_app_list_failure'),
          description: t('install.update_app_list_failure_description', {error: error.message || t('common.unknown_error')}),
        })
      }).finally(() => {
        off()
      })
    } else if (value === 'install_from_url') {
      // 从URL安装应用
      Alert({
        type: "prompt",
        title: t('install.install_title'),
        placeholder: t('install.install_from_url_placeholder'),
        onConfirm: async (value) => {
          if (!value) {
            return;
          }
          await InternalApi.downloadApp(value).then(async ({data}) => {
            await fetchApps();
            if (data) {
              const app = apps.find(item => item.id === data.id);
              if (app) {
                setSelectedApp(app);
                setOpenInstall(true);
              }
            }
          }).catch((error) => {
            Alert({
              type: "warning",
              title: t('install.failure'),
              description: t('install.failure_description', {app: value, error: error.message || t('common.unknown_error')}),
              showCancel: false,
            })
            throw error;
          }).finally(() => {
            fetchApps();
          })
        }
      })
    }
  }

  return (
    <main ref={mainRef} className="h-screen flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden pt-4 lg:pt-6 gap-y-3 md:gap-y-4 lg:gap-y-5">

        {/* 导航、搜索、菜单 */}
        <div className="px-4 lg:px-7 flex flex-wrap items-center gap-4">
          <div className="flex items-center flex-1 whitespace-nowrap">
            {!props.isSubElectron && (
              <ChevronLeft className="min-md:hidden mr-4" onClick={backApp} />
            )}
            <h1 className="text-2xl font-bold mr-2 text-gray-900 dark:text-zinc-100">{t('common.title')}</h1>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => fetchApps()}>
              {loading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            </Button>
          </div>
          <div className="flex items-center gap-x-4 w-full sm:w-auto sm:min-w-[300px]">
            <AppSearch onSearch={handleSearch} />
            <Dropdown className="h-10" options={[
              {value: 'update_app_list', label: t('install.update_app_list')},
              {value: 'install_from_url', label: t('install.install_from_url')},
            ]} onChange={handleMenuChange} />
          </div>
        </div>

        <div className="px-4 lg:px-7 pb-4 lg:pb-6 flex-1 overflow-auto flex flex-col gap-y-3 md:gap-y-4 lg:gap-y-5">
          {/* 安装状态 */}
          <div className="flex gap-x-4">
            <Button
              variant={filter === 'all' ? "secondary" : "ghost"}
              className="px-4 py-2 text-sm rounded-full"
              onClick={() => setFilter('all')}>
              {t('app.all')}
            </Button>
            <Button
              variant={filter === 'installed' ? "secondary" : "ghost"}
              className="px-4 py-2 text-sm rounded-full"
              onClick={() => setFilter('installed')}>
              {t('app.installed')}
            </Button>
            {(hasUpgradeableApps || filter === 'upgradeable') && (
              <Button
                variant={filter === 'upgradeable' ? "secondary" : "ghost"}
                className="px-4 py-2 text-sm rounded-full relative"
                onClick={() => setFilter('upgradeable')}>
                {t('app.upgradeable')}
                <div className="absolute top-1 right-2 size-2 bg-red-500 rounded-full"></div>
              </Button>
            )}
          </div>

          {/* 类别、列表 */}
          {categories.length > 0 && (
            <Tabs defaultValue="all" className="flex-1 gap-y-4 md:gap-y-5 lg:gap-y-6" value={selectedCategory} onValueChange={setSelectedCategory}>

              {/* 类别 */}
              {categories.length > 2 && (
                <TabsList className="flex w-full md:max-w-md light:bg-gray-100">
                  {categories.slice(0,5).map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="text-sm">
                      {cat === 'all' ? t('app.all') : cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}

              {/* 列表 */}
              {categories.slice(0,5).map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue}>
                  {loading && getFilteredApps().length === 0 ? (
                    <div className="text-center py-10">
                      <p>{t('app.loading')}</p>
                    </div>
                  ) : getFilteredApps().length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
                      {getFilteredApps().map((app) => (
                        <AppCard
                          key={app.name}
                          icon={app.icon}
                          title={app.name}
                          description={app.description}
                          status={app.config.status}
                          upgradeable={app.upgradeable}
                          category={app.tags?.length ? app.tags : []}
                          onOpen={() => handleOpenApp(app)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-content text-center py-10 text-gray-500">
                      {searchKeyword ? (
                        <p>{t('app.no_apps_found', {keyword: searchKeyword})}</p>
                      ) : (
                        <>
                          {filter === 'all' && (
                            <p>{t('app.no_apps')}</p>
                          )}
                          {filter === 'installed' && (
                            <p>{t('app.no_installed_apps')}</p>
                          )}
                          {filter === 'upgradeable' && (
                            <p>{t('app.no_upgradeable_apps')}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* 分页 */}
          {getFilteredApps().length > 0 && (
            <div className="mt-1 md:mt-2 flex justify-between items-center text-sm text-gray-500">
              <div>{t('app.totalItems', {count: getFilteredApps().length})}</div>
              <div className="flex items-center gap-x-2">
                <Button variant="outline" size="icon" className="w-7 h-7" disabled={true}>
                  <ChevronLeft />
                </Button>
                <span>1</span>
                <span>/</span>
                <span>1</span>
                <span>{t('app.page')}</span>
                <Button variant="outline" size="icon" className="w-7 h-7" disabled={true}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 应用详情 */}
      <Drawer
        open={openDetail}
        onOpenChange={setOpenDetail}
        title={t('app.detail')}
        className="rounded-l-xl w-[1000px] max-w-[90vw]">
        {selectedApp && <AppDetail appId={selectedApp.id} onInstall={handleInstall} onUninstall={handleUninstall} />}
      </Drawer>

      {/* 安装应用 */}
      <Drawer
        open={openInstall}
        onOpenChange={setOpenInstall}
        title={
          selectedApp?.upgradeable ? t('app.upgrade') :
            selectedApp?.config.status === 'installed' ? t('app.reinstall') :
              t('app.install')
        }
        className="rounded-l-xl w-[600px] max-w-[80vw]">
        {selectedApp && <AppInstall appId={selectedApp.id} onClose={() => setOpenInstall(false)} />}
      </Drawer>
    </main>
  )
}

export default Internal
