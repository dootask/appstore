import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Globe, UserCircle, Zap, Sparkles, ArrowRight, Filter, Sun, Moon } from 'lucide-react';
import i18n from '@/i18n';
import LogoIcon from '@/assets/logo.svg'
import Dropdown from '@/components/custom/dropdown';
import { supportedLanguagesMap, languageOptionsForDropdown, setTheme, setLanguage } from '@/store/config';
import { useTranslation, Trans } from 'react-i18next';
import { useAppStore } from "@/store/app.ts";
import HomeCard from './card';
import { Alert, Toast } from '@/components/custom/prompt';
import Drawer from '@/components/custom/drawer';
import type { App } from '@/types/api';
import AppDetail from './detail';
import { ScrollArea } from '@/components/ui/scroll-area';

const Home: React.FC = () => {
  const {t} = useTranslation();
  const {apps, categories, fetchApps} = useAppStore();
  const marketplaceRef = useRef<HTMLElement>(null);
  const [currentLanguage, setCurrentLanguageLocal] = useState(i18n.language);
  const [currentLanguageLabel, setCurrentLanguageLabelLocal] = useState(supportedLanguagesMap[i18n.language] || i18n.language);
  const [filterType, setFilterType] = useState<'popular' | 'featured' | 'category' | 'search'>('popular');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [showAppDetail, setShowAppDetail] = useState<boolean>(false);

  const [currentTheme, setCurrentThemeLocal] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.body.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleThemeHandler = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleLanguageChangeHandler = (langCode: string) => {
    setLanguage(langCode);
  };

  useEffect(() => {
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newThemeOnBody = document.body.classList.contains('dark') ? 'dark' : 'light';
          if (newThemeOnBody !== currentTheme) {
            setCurrentThemeLocal(newThemeOnBody);
          }
        }
      }
    });
    if (typeof window !== 'undefined') {
      observer.observe(document.body, {attributes: true});
    }

    const i18nLanguageChanged = (lng: string) => {
      setCurrentLanguageLocal(lng);
      setCurrentLanguageLabelLocal(supportedLanguagesMap[lng] || lng);
    };
    i18n.on('languageChanged', i18nLanguageChanged);

    return () => {
      observer.disconnect();
      i18n.off('languageChanged', i18nLanguageChanged);
    };
  }, [currentTheme]);

  const showAppDownloadUrl = (app: App) => {
    Alert({
      type: "prompt",
      title: t('home.appDisplayCard.getButtonApp'),
      description: t('home.appDisplayCard.copyButtonAppDescription'),
      defaultValue: app.download_url,
      buttonText: t('home.appDisplayCard.copyButton'),
      showCancel: true,
      showConfirm: true,
      onConfirm: async () => {
        try {
          await navigator.clipboard.writeText(app.download_url);
          Toast({
            type: 'success',
            content: t('common.copySuccess'),
            duration: 2000
          });
        } catch (error) {
          Toast({
            type: 'error',
            content: t('common.copyFailed'),
            duration: 2000
          });
          console.error(error);
        }
      }
    });
  }

  const handleMaintenance = () => {
    Alert({
      type: 'info',
      title: t('home.support.warning'),
      description: t('home.support.maintenance'),
      showCancel: false,
    });
  }

  const filteredApps = useMemo(() => {
    let filtered = [...apps];

    if (filterType === 'category' && selectedCategory !== 'all') {
      filtered = filtered.filter(app => {
        const tags = app.tags || [];
        return tags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase());
      });
    }

    let isEffectiveSearch = false;
    if (filterType === 'search' && searchKeyword.trim() !== '') {
      isEffectiveSearch = true;
      const keyword = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(app => {
        return (
          app.name.toLowerCase().includes(keyword) ||
          app.description.toLowerCase().includes(keyword) ||
          (app.tags && app.tags.some(tag => tag.toLowerCase().includes(keyword)))
        );
      });
    }

    filtered = [...filtered].sort(() => Math.random() - 0.5);
    if (isEffectiveSearch || filterType === 'category') {
      return filtered.slice(0, 12);
    }
    return filtered.slice(0, 3);
  }, [apps, filterType, selectedCategory, searchKeyword]);

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    setFilterType('search');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setFilterType('category');
  };

  useEffect(() => {
    // 设置页面标题
    document.title = t('home.header.title');
    // 获取应用列表
    fetchApps()
  }, []);

  const supportOptions = [
    {
      label: t('home.support.development'),
      value: 'development'
    },
    {
      label: t('home.support.publish'),
      value: 'publish'
    },
  ];

  return (
    <ScrollArea className="bg-white dark:bg-black text-gray-900 dark:text-white h-screen">
      {/* Header */}
      <header className="px-8 md:px-16 h-17 flex items-center">
        <div className="container mx-auto flex items-center">
          <a href="https://www.dootask.com" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 flex-1 justify-start">
            <img src={LogoIcon} alt="Logo" className="w-7 h-7" />
            <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">{t('home.header.title')}</span>
          </a>
          <nav className="hidden md:flex items-center space-x-6 flex-1 justify-center min-w-0">
            <Dropdown
              options={
                categories.slice(0, 10).map(cat => ({label: cat === 'all' ? t('app.all') : cat, value: cat}))
              }
              onChange={(value) => {
                handleCategoryChange(value)
                marketplaceRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
              }}
              className="py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center truncate min-w-0 max-w-full cursor-pointer"
            >
              <span className='whitespace-nowrap overflow-hidden text-ellipsis'>{t('home.header.category')}</span>
              <ChevronDown className="w-4 h-4 ml-1 shrink-0" />
            </Dropdown>
            <Dropdown
              options={supportOptions}
              onChange={() => {
                handleMaintenance()
              }}
              className="py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center truncate min-w-0 max-w-full cursor-pointer"
            >
              <span className='whitespace-nowrap overflow-hidden text-ellipsis'>{t('home.header.support')}</span>
              <ChevronDown className="w-4 h-4 ml-1 shrink-0" />
            </Dropdown>
          </nav>
          <div className="flex items-center space-x-4 flex-1 justify-end">
            <Dropdown
              options={languageOptionsForDropdown}
              defaultValue={currentLanguage}
              onChange={handleLanguageChangeHandler}
              className="flex items-center text-sm p-2 py-3 gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              <Globe className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block">{currentLanguageLabel}</span>
            </Dropdown>
            <button
              onClick={toggleThemeHandler}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-md cursor-pointer"
              aria-label={t(currentTheme === 'dark' ? 'home.header.themeToggleLight' : 'home.header.themeToggleDark')}
            >
              {currentTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer" onClick={() => {
              handleMaintenance()
            }}>
              <UserCircle className="w-8 h-8" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-8 text-center">
        <div
          className="inline-flex items-center bg-gray-200 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/70 rounded-full py-2 px-4 mb-6 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          onClick={() => {
            Toast({
              type: 'info',
              direction: 'middle',
              content: t('home.hero.seriesBAnnouncement'),
            })
          }}
        >
          <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-2" />
          {t('home.hero.seriesBAnnouncement')}
          <ArrowRight className="w-4 h-4 ml-2 text-gray-500 dark:text-gray-400" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
          {t('home.hero.titlePart1')} <Sparkles className="w-10 h-10 md:w-14 md:h-14 inline-block text-green-500 dark:text-green-400 mx-1" /> {t('home.hero.titlePart2')}<br />
          {t('home.hero.titlePart3')}
        </h1>
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder={t('home.hero.searchPlaceholder')}
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full py-4 px-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded px-2.5 h-7 font-mono flex items-center gap-1.5">
              <span className="text-base">⌘</span>
              <span>F</span>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Marketplace Section */}
      <section ref={marketplaceRef} className="py-12 px-8 md:px-16 bg-white dark:bg-black">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">{t('home.marketplace.title')}</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setFilterType('featured')}
                className={`py-2 px-4 rounded-lg text-sm border transition-colors duration-150 ${
                  filterType === 'featured'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 font-semibold'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}
              >
                {t('home.marketplace.featuredButton')}
              </button>
              <button
                onClick={() => setFilterType('popular')}
                className={`py-2 px-4 rounded-lg text-sm border transition-colors duration-150 ${
                  filterType === 'popular'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 font-semibold'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}
              >
                {t('home.marketplace.popularButton')}
              </button>
              <Dropdown
                options={
                  categories.slice(0, 10).map(cat => ({label: cat === 'all' ? t('app.all') : cat, value: cat}))
                }
                onChange={(value) => handleCategoryChange(value)}
                className={`p-2 rounded-lg border transition-colors duration-150 ${
                  filterType === 'category' && selectedCategory !== 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}
              >
                <Filter className="w-5 h-5" />
              </Dropdown>
            </div>
          </div>

          {/* App Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredApps.map((app, index) => {
              const colorConfigs = [
                {
                  bgColorClass: "bg-green-100 dark:bg-green-600/20",
                  iconColorClass: "text-green-600 dark:text-green-400",
                  buttonBgClass: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700",
                  textColorClass: "text-green-600 dark:text-green-400 font-bold"
                },
                {
                  bgColorClass: "bg-yellow-100 dark:bg-yellow-500/20",
                  iconColorClass: "text-yellow-600 dark:text-yellow-400",
                  buttonBgClass: "bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700",
                  textColorClass: "text-yellow-600 dark:text-yellow-400 font-bold"
                },
                {
                  bgColorClass: "bg-blue-100 dark:bg-blue-600/20",
                  iconColorClass: "text-blue-600 dark:text-blue-400",
                  buttonBgClass: "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700",
                  textColorClass: "text-blue-600 dark:text-blue-400 font-bold"
                }
              ]

              const colorConfig = colorConfigs[index % colorConfigs.length]

              return (
                <HomeCard
                  key={app.id}
                  bgColorClass={colorConfig.bgColorClass}
                  iconColorClass={colorConfig.iconColorClass}
                  buttonBgClass={colorConfig.buttonBgClass}
                  textColorClass={colorConfig.textColorClass}
                  cardBgClass="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300"
                  app={app}
                  onSelect={() => {
                    setSelectedApp(app);
                    setShowAppDetail(true);
                  }}
                  onDownload={() => {
                    showAppDownloadUrl(app);
                  }}
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="py-10 mt-16 border-t border-gray-200/80 dark:border-gray-800/80">
        <div className="container mx-auto text-center text-gray-500 dark:text-gray-400 text-sm">
          <Trans i18nKey="home.footer.copyright" year={new Date().getFullYear()}>
            © {{year: new Date().getFullYear()}} DooTask.com. All rights reserved. <br />
          </Trans>
          {t('home.footer.illustrativeDesign')}
        </div>
      </footer>

      <Drawer
        open={showAppDetail}
        onOpenChange={() => {
          setShowAppDetail(false);
        }}
        direction="bottom"
        className="rounded-t-xl max-h-[90vh] bg-white dark:bg-zinc-900"
      >
        <AppDetail app={selectedApp} onDownload={() => {
          if (selectedApp) {
            showAppDownloadUrl(selectedApp);
          }
        }} />
      </Drawer>
    </ScrollArea>
  );
}

export default Home;
