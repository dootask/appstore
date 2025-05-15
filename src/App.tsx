import i18n from "@/i18n";
import { Drawer as DrawerPrimitive } from "vaul"
import { useEffect, useRef, useState } from 'react'
import { Button } from './components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "./components/ui/drawer"
import { useTranslation } from "react-i18next";
import { props, backApp, nextZIndex, interceptBack, requestAPI } from "@dootask/tools";
import { X, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";
import { AppSearch } from './components/app-search';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { AppCard } from './components/app-card';
import type { AppItem } from "@/types/app.ts";
import { AppDetail } from "./components/app-detail"
import { beforeClose } from "@/lib/utils.ts";
import { AppInstall } from './components/app-install.tsx';
import PromptPortal, { Alert, Notice } from "@/components/custom/prompt";
import { useAppStore } from '@/lib/store';
import Dropdown from "./components/custom/dropdown.tsx";

function App() {
  const {t} = useTranslation();
  const {apps, loading, fetchApps} = useAppStore();
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null)
  const [preInstallApp, setPreInstallApp] = useState(false)
  const [detailZIndex, setDetailZIndex] = useState(1000);
  const [installZIndex, setInstallZIndex] = useState(1000);
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['all']);
  const [searchKeyword, setSearchKeyword] = useState('');
  const mainRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    // 设置主题
    if (props.themeName === 'dark') {
      document.body.classList.add('doo-dark')
    }
    // 设置语言
    i18n.changeLanguage(props.languageName)
    // 获取应用列表数据
    fetchApps();
    // 拦截返回事件
    const off = interceptBack(() => {
      return beforeClose();
    })
    // 监听应用列表变化
    const unsubscribe = useAppStore.subscribe(
      ({apps}, {apps: prevApps}) => {
        apps.forEach(app => {
          const prevApp = prevApps.find(p => p.name === app.name);
          if (prevApp && prevApp.config.status !== app.config.status) {
            if (app.config.status === 'installing') {
              Notice({
                type: "info",
                title: t('install.title'),
                description: t('install.install_starting', {app: app.info.name}),
              })
            } else if (app.config.status === 'installed') {
              Notice({
                type: "success",
                title: t('install.title'),
                description: t('install.install_success', {app: app.info.name}),
              })
            } else if (app.config.status === 'uninstalling') {
              Notice({
                type: "warning",
                title: t('uninstall.title'),
                description: t('uninstall.uninstall_starting', {app: app.info.name}),
              })
            } else if (app.config.status === 'not_installed') {
              Notice({
                type: "success",
                title: t('uninstall.success'),
                description: t('uninstall.success_description', {app: app.info.name}),
              })
            } else if (app.config.status === 'error' && prevApp.config.status === 'installing') {
              Notice({
                type: "error",
                title: t('install.title'),
                description: t('install.install_failed', {app: app.info.name})
              })
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
    // 设置定时器
    timerRef.current = setInterval(() => {
      if (apps.find(item => ['installing', 'uninstalling'].includes(item.config.status))) {
        fetchApps(true);
      }
    }, 10000)
    // 清理定时器
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [apps])

  // 提取应用标签并更新可用类别
  useEffect(() => {
    if (apps.length > 0) {
      // 收集所有应用的标签
      const allTags = apps.flatMap(app => app.info.tags || []);
      // 去重并保留非空标签
      const uniqueTags = [...new Set(allTags)].filter(tag => tag.trim() !== '');
      // 最多保留4个标签（加上 'all' 总共5个）
      const limitedTags = uniqueTags.slice(0, 4);
      // 始终保留 'all' 作为第一个选项
      const categories = ['all', ...limitedTags];
      setAvailableCategories(categories);

      // 如果当前选中的类别不在新的类别列表中，重置为 'all'
      if (category !== 'all' && !limitedTags.includes(category)) {
        setCategory('all');
      }
    }
  }, [apps, category]);

  // 过滤应用列表
  const getFilteredApps = () => {
    let filtered = [...apps];

    // 按安装状态过滤
    if (filter === 'installed') {
      filtered = filtered.filter(app => app.config.status === 'installed');
    }

    // 按类别过滤
    if (category !== 'all') {
      filtered = filtered.filter(app => {
        const tags = app.info.tags || [];
        return tags.some(tag => tag.toLowerCase() === category.toLowerCase());
      });
    }

    // 按搜索关键词过滤
    if (searchKeyword.trim() !== '') {
      const keyword = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(app => {
        return (
          app.info.name.toLowerCase().includes(keyword) ||
          app.info.description.toLowerCase().includes(keyword) ||
          (app.info.tags && app.info.tags.some(tag => tag.toLowerCase().includes(keyword)))
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
  const handleOpenApp = (app: AppItem) => {
    setDetailZIndex(nextZIndex());
    setSelectedApp(app);
  }

  // 点击安装、卸载、错误等操作
  const handleOperation = (app: AppItem) => {
    if (app.config.status === 'installed') {
      // 卸载应用
      Alert({
        type: "warning",
        title: t('uninstall.title'),
        description: t('uninstall.description', {app: app.info.name}),
        showCancel: true,
        onConfirm: async () => {
          // 确认卸载
          await requestAPI({
            url: "apps/uninstall",
            data: {
              app_name: app.name
            }
          }).then(() => {
            // 卸载成功
            setSelectedApp(null);
          }).catch((error) => {
            // 卸载失败
            Alert({
              type: "warning",
              title: t('uninstall.error'),
              description: t('uninstall.error_description', {app: app.info.name, error: error.msg || t('uninstall.unknown_error')}),
              showCancel: false,
            })
          }).finally(() => {
            // 请求应用列表
            fetchApps();
          })
        }
      })
    } else {
      // 安装应用
      setInstallZIndex(nextZIndex())
      setPreInstallApp(true)
    }
  }

  // 菜单项点击事件
  const handleMenuChange = (value: string) => {
    if (value === 'update_app_list') {
      // 更新应用列表
    } else if (value === 'install_from_url') {
      // 从URL安装应用
    }
  }

  return (
    <main ref={mainRef} className="min-h-screen p-4 md:p-6">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3 md:mb-4">
          <div className="flex items-center">
            {!props.isSubElectron && (
              <ChevronLeft className="min-md:hidden mr-4" onClick={backApp}/>
            )}
            <h1 className="text-2xl font-bold mr-2">{t('common.title')}</h1>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => fetchApps()}>
              {loading ? <LoaderCircle className="animate-spin"/> : <RefreshCw/>}
            </Button>
          </div>
          <div className="flex items-center gap-x-4 w-full sm:w-auto sm:min-w-[300px]">
            <AppSearch onSearch={handleSearch}/>
            <Dropdown className="h-10" options={[
              {value: 'update_app_list', label: t('common.update_app_list')},
              {value: 'install_from_url', label: t('common.install_from_url')},
            ]} onChange={handleMenuChange}/>
          </div>
        </div>

        <div className="flex gap-x-4 mb-3 md:mb-4">
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
        </div>

        {availableCategories.length > 2 && (
          <Tabs defaultValue="all" className="mb-3 md:mb-4" value={category} onValueChange={setCategory}>
            <TabsList className="flex w-full md:max-w-md light:bg-gray-100 mb-3 md:mb-4">
              {availableCategories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-sm">
                  {cat === 'all' ? t('app.all') : cat}
                </TabsTrigger>
              ))}
            </TabsList>

            {availableCategories.map((tabValue) => (
              <TabsContent key={tabValue} value={tabValue}>
                {loading && getFilteredApps().length === 0 ? (
                  <div className="text-center py-10">
                    <p>{t('app.loading')}</p>
                  </div>
                ) : getFilteredApps().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getFilteredApps().map((app) => (
                      <AppCard
                        key={app.name}
                        icon={app.info.icon}
                        title={app.info.name}
                        description={app.info.description}
                        status={app.config.status}
                        category={app.info.tags?.length ? app.info.tags : []}
                        onOpen={() => handleOpenApp(app)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-content text-center py-10 text-gray-500">
                    <p>{t('app.noApps')}</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {getFilteredApps().length > 0 && (
          <div className="flex justify-between items-center text-sm text-gray-500 mt-4 md:mt-6">
            <div>{t('app.totalItems', {count: getFilteredApps().length})}</div>
            <div className="flex items-center gap-x-2">
              <Button variant="outline" size="icon" className="w-7 h-7">
                <ChevronLeft/>
              </Button>
              <span>1</span>
              <span>/</span>
              <span>1</span>
              <span>{t('app.page')}</span>
              <Button variant="outline" size="icon" className="w-7 h-7">
                <ChevronRight/>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 应用详情、安装应用 */}
      <Drawer
        modal={false}
        dismissible={false}
        container={mainRef.current}
        open={!!selectedApp}
        direction={"right"}
        onOpenChange={(open) => !open && setSelectedApp(null)}>
        {selectedApp && (
          <div className="fixed top-0 right-0 left-0 bottom-0 bg-black/40 animate-fade-in pointer-events-auto doo-dark:bg-white/40" style={{zIndex: detailZIndex}} onClick={() => setSelectedApp(null)}></div>
        )}
        {preInstallApp && !!selectedApp && (
          <div className="fixed top-0 right-0 left-0 bottom-0 bg-black/40 animate-fade-in pointer-events-auto doo-dark:bg-white/40" style={{zIndex: installZIndex}}></div>
        )}
        <DrawerContent style={{zIndex: detailZIndex}} className="rounded-l-xl !w-[1000px] !max-w-[90vw]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-between">
              <div className="text-base">
                {t('app.detail')}
              </div>
              <DrawerClose role="app-store-close" role-index={detailZIndex} className="cursor-pointer" onClick={() => setSelectedApp(null)}>
                <X size={20}/>
              </DrawerClose>
            </DrawerTitle>
          </DrawerHeader>
          {/* 应用详情 */}
          {selectedApp && <AppDetail appName={selectedApp.name} onOperation={handleOperation}/>}
          {/* 安装应用 */}
          <DrawerPrimitive.NestedRoot
            modal={false}
            dismissible={false}
            container={mainRef.current}
            open={preInstallApp && !!selectedApp}
            direction={"right"}
            onOpenChange={setPreInstallApp}>
            <DrawerContent style={{zIndex: installZIndex}} className="rounded-l-xl !w-[600px] !max-w-[80vw]">
              <DrawerHeader>
                <DrawerTitle className="flex items-center justify-between">
                  <div className="text-base">
                    {t('app.install')}
                  </div>
                  <DrawerClose role="app-store-close" role-index={installZIndex} className="cursor-pointer" onClick={() => setPreInstallApp(false)}>
                    <X size={20}/>
                  </DrawerClose>
                </DrawerTitle>
              </DrawerHeader>
              {preInstallApp && !!selectedApp && <AppInstall appName={selectedApp.name} onClose={() => setPreInstallApp(false)}/>}
            </DrawerContent>
          </DrawerPrimitive.NestedRoot>
        </DrawerContent>
      </Drawer>

      {/* 提示弹窗 */}
      <PromptPortal/>
    </main>
  )
}

export default App
