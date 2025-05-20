import type { App } from '@/types/api';
import { Download, Users, Star, BookOpen, GitBranch, ExternalLink, Heart } from 'lucide-react';
import Github from '@/assets/github.svg';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useState, useEffect } from 'react';
import { AppApi } from '@/lib';
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { darcula as SyntaxStyle } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function AppDetail({app, onDownload}: { app: App | null, onDownload: () => void }) {
  const {t} = useTranslation();
  const [starred, setStarred] = useState(false);
  const [loading, setLoading] = useState(true)
  const [appReadme, setAppReadme] = useState("")

  // 获取本地收藏列表
  const getStarredApps = () => {
    try {
      const data = localStorage.getItem('starredApps');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  // 切换收藏状态
  const toggleStar = () => {
    if (!app) return;
    let starredApps = getStarredApps();
    if (starred) {
      starredApps = starredApps.filter((id: string) => id !== app.id);
    } else {
      starredApps.push(app.id);
    }
    localStorage.setItem('starredApps', JSON.stringify(starredApps));
    setStarred(!starred);
  };

  // 进入页面时判断当前app是否已收藏
  useEffect(() => {
    if (!app) return;
    // 获取应用详情
    AppApi.getAppReadme(app.id).then(({data}) => {
      if (data) {
        setAppReadme(data.content)
      }
    }).catch((err) => {
      console.error(err)
    }).finally(() => {
      setLoading(false)
    })
    // 获取本地收藏列表
    const starredApps = getStarredApps();
    setStarred(starredApps.includes(app.id));
  }, [app]);

  if (!app) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center">
        {t('home.appDetail.noAppSelected')}
      </div>
    );
  }

  const detailItems = [
    app.versions?.[0] && {icon: GitBranch, labelKey: 'install.latest_version', value: app.versions[0]},
    app.rating && {icon: Heart, labelKey: 'home.appDetail.rating', value: `${app.rating.toFixed(1)}/5.0`, className: 'text-yellow-500 dark:text-yellow-400'},
    app.downloads && {icon: Download, labelKey: 'home.appDetail.downloads', value: app.downloads},
    app.user_count && {icon: Users, labelKey: 'home.appDetail.users', value: app.user_count},
  ].filter(Boolean) as { icon: React.ElementType; labelKey: string; value: string; className?: string }[];

  return (
    <div className="pt-4 sm:pt-6 md:pt-8 text-gray-900 dark:text-gray-100 h-full flex flex-col">
      <header className="mx-4 sm:mx-6 md:mx-8 flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          {app.icon && (
            <img src={app.icon} alt={app.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-md" />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{app.name}</h1>
            {app.author && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('home.appDetail.by')} {app.author}</p>}
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
          <button
            aria-label={t('home.appDetail.favoriteButtonLabel')}
            className={`p-2 rounded-lg transition-colors ${starred ? 'text-yellow-400' : 'text-gray-600 dark:text-gray-300'} hover:bg-gray-100 dark:hover:bg-zinc-700`}
            onClick={toggleStar}
          >
            <Star className={`w-5 h-5 ${starred ? 'fill-yellow-400' : ''}`} />
          </button>
          {app.website && (
            <a
              href={app.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('home.appDetail.visitWebsiteButtonLabel')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={onDownload}
            className="ml-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-semibold rounded-lg flex items-center justify-center transition-colors text-sm sm:text-base"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t('home.appDetail.downloadButton')}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden">
        <ScrollArea className="h-full">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
            {(detailItems.length > 0 || (app.tags && app.tags.length > 0) || app.document || app.github) && (
              <section className="mb-10 md:mb-12">
                {/* 关键指标卡片 */}
                {detailItems.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                    {detailItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center justify-center bg-gray-100/80 dark:bg-zinc-800 rounded-xl p-3 md:p-5"
                      >
                        <item.icon className={`w-7 h-7 mb-2 ${item.className || 'text-gray-500 dark:text-gray-400'}`} />
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(item.labelKey)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 标签 */}
                {app.tags && app.tags.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2.5">{t('home.appDetail.tags')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {app.tags.map(tag => (
                        <span
                          key={tag}
                          className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium px-3 py-1.5 rounded-full"
                        >
                        {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 链接 */}
                {(app.document || app.github) && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2.5">{t('home.appDetail.links')}</h3>
                    <div className="flex flex-wrap gap-4">
                      {app.document && (
                        <a
                          href={app.document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          {t('home.appDetail.documentation')}
                        </a>
                      )}
                      {app.github && (
                        <a
                          href={app.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition"
                        >
                          <img src={Github} alt="GitHub" className="w-4 h-4 mr-2 dark:invert" />
                          {t('home.appDetail.sourceCode')}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">{t('home.appDetail.contentTitle')}</h2>
              {loading ? (
                <div className="space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm sm:prose dark:prose-invert max-w-none">
                  <Skeleton className="h-4 w-full bg-gray-200 dark:bg-zinc-700 rounded" />
                  <Skeleton className="h-4 w-full bg-gray-200 dark:bg-zinc-700 rounded" />
                  <Skeleton className="h-4 w-[85%] bg-gray-200 dark:bg-zinc-700 rounded" />
                  <Skeleton className="h-4 w-[70%] bg-gray-200 dark:bg-zinc-700 rounded" />
                  <Skeleton className="mt-6 w-full aspect-[16/9] rounded-lg bg-gray-200 dark:bg-zinc-700" />
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
            </section>

          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
