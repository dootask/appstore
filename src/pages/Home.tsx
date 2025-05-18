import React, { useState, useEffect } from 'react';
import { ChevronDown, Globe, UserCircle, Zap, Sparkles, ArrowRight, Heart, Filter, Folder, Activity, Wallet, Sun, Moon } from 'lucide-react';
import i18n from '@/i18n';
import Dropdown from '@/components/custom/dropdown';
import {
  supportedLanguagesMap,
  languageOptionsForDropdown,
  setTheme,
  setLanguage
} from '@/store/config';
import { useTranslation, Trans } from 'react-i18next';

const AppDisplayCard: React.FC<{
  titleKey: string;
  rating: number;
  users: string;
  downloads: string;
  icon: React.ReactElement<{ className?: string, size?: number | string }>;
  bgColorClass: string;
  iconColorClass: string;
  buttonBgClass: string;
  textColorClass: string;
  cardBgClass: string;
}> = ({titleKey, rating, users, downloads, icon, bgColorClass, iconColorClass, buttonBgClass, textColorClass, cardBgClass}) => {
  const { t } = useTranslation();
  const sizedIcon = React.cloneElement(icon, {
    className: `${icon.props.className || ''} w-7 h-7 ${iconColorClass}`.trim(),
    size: 28
  });

  return (
    <div className={`p-6 rounded-2xl shadow-lg ${cardBgClass} border border-gray-200 dark:border-gray-700 flex flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColorClass}`}>
          {sizedIcon}
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Heart className="w-4 h-4 text-pink-500 dark:text-pink-400 mr-1" fill="currentColor" />
          <span>{rating.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex-grow">
        <h3 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">{t(titleKey)}</h3>
        <div className="mb-4 space-y-1 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('home.appDisplayCard.totalUsers')}</span>
            <span className={`font-semibold ${textColorClass}`}>{users}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('home.appDisplayCard.downloads')}</span>
            <span className={`font-semibold ${textColorClass}`}>{downloads}</span>
          </div>
        </div>
      </div>
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-5"></div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-700 dark:text-gray-300">{t('home.appDisplayCard.downloadAppButton')}</span>
        <button className={`${buttonBgClass} text-white font-semibold py-2 px-4 rounded-lg flex items-center text-sm transition-colors duration-150`}>
          {t('home.appDisplayCard.getButton')} <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [currentTheme, setCurrentThemeLocal] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.body.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const [currentLanguage, setCurrentLanguageLocal] = useState(i18n.language);
  const [currentLanguageLabel, setCurrentLanguageLabelLocal] = useState(supportedLanguagesMap[i18n.language] || i18n.language);

  const toggleThemeHandler = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
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
            const storedTheme = localStorage.getItem('theme');
            if (newThemeOnBody !== storedTheme) {
                localStorage.setItem('theme', newThemeOnBody);
            }
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

  const categoryOptions = [
    {
      label: '全部',
      value: 'all'
    },
    {
      label: '开发工具',
      value: 'development'
    }
  ];

  const supportOptions = [
    {
      label: '开发文档',
      value: 'support'
    },
    {
      label: '发布应用',
      value: 'support'
    },
  ];

  return (
    <div className="bg-white dark:bg-black text-gray-900 dark:text-white min-h-screen">
      {/* Header */}
      <header className="px-8 md:px-16 h-17 flex items-center">
        <div className="container mx-auto flex items-center">
          <div className="flex items-center space-x-2 flex-1 justify-start">
            <svg className="w-7 h-7" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <path d="M827.733333 243.2c-46.933333-46.933333-106.666667-81.066667-170.666666-98.133333-29.866667-8.533333-68.266667-12.8-98.133334-12.8H85.333333v192l132.266667 132.266666V264.533333H554.666667c34.133333 0 68.266667 8.533333 98.133333 21.333334 29.866667 12.8 55.466667 29.866667 76.8 51.2 46.933333 46.933333 72.533333 106.666667 72.533333 174.933333s-25.6 128-72.533333 174.933333c-46.933333 46.933333-106.666667 72.533333-174.933333 72.533334H409.6L273.066667 896H554.666667c209.066667 0 379.733333-170.666667 379.733333-379.733333 4.266667-110.933333-38.4-204.8-106.666667-273.066667z" fill="#8BCF70"></path>
              <path d="M657.066667 320V512l-247.466667 247.466667-132.266667 132.266666L85.333333 704V512l136.533334 136.533333 55.466666 55.466667z" fill="#FFDD33"></path>
            </svg>
            <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">App Store</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6 flex-1 justify-center min-w-0">
          <Dropdown
              options={categoryOptions}
              onChange={() => {}}
              className="py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center truncate min-w-0 max-w-full cursor-pointer"
            >
              <span className='whitespace-nowrap overflow-hidden text-ellipsis'>{t('home.header.category')}</span>
              <ChevronDown className="w-4 h-4 ml-1 shrink-0" />
            </Dropdown>
            <Dropdown
              options={supportOptions}
              onChange={() => {}}
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
            <div className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer">
              <UserCircle className="w-8 h-8" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-8 text-center">
        <div className="inline-flex items-center bg-gray-200 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/70 rounded-full py-2 px-4 mb-6 text-sm text-gray-700 dark:text-gray-300">
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
      <section className="py-12 px-8 md:px-16 bg-white dark:bg-black">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">{t('home.marketplace.title')}</h2>
            <div className="flex items-center space-x-3">
              <button className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg text-sm border border-gray-300 dark:border-gray-700 transition-colors duration-150">{t('home.marketplace.featuredButton')}</button>
              <button className="bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 px-4 rounded-lg text-sm border border-gray-300 dark:border-gray-600 font-semibold transition-colors duration-150">{t('home.marketplace.popularButton')}</button>
              <button className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded-lg border border-gray-300 dark:border-gray-700 transition-colors duration-150">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* App Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AppDisplayCard
              icon={<Folder />}
              bgColorClass="bg-green-100 dark:bg-green-600/20"
              iconColorClass="text-green-600 dark:text-green-400"
              buttonBgClass="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
              textColorClass="text-green-600 dark:text-green-400 font-bold"
              cardBgClass="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300"
              titleKey="home.appTitles.fileManager"
              rating={4.9}
              users="5.2k"
              downloads="9,04,012 +"
            />
            <AppDisplayCard
              icon={<Activity />}
              bgColorClass="bg-yellow-100 dark:bg-yellow-500/20"
              iconColorClass="text-yellow-600 dark:text-yellow-400"
              buttonBgClass="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
              textColorClass="text-yellow-600 dark:text-yellow-400 font-bold"
              cardBgClass="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300"
              titleKey="home.appTitles.analyticsData"
              rating={5.0}
              users="9.2k"
              downloads="1,00,000 +"
            />
            <AppDisplayCard
              icon={<Wallet />}
              bgColorClass="bg-blue-100 dark:bg-blue-600/20"
              iconColorClass="text-blue-600 dark:text-blue-400"
              buttonBgClass="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              textColorClass="text-blue-600 dark:text-blue-400 font-bold"
              cardBgClass="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300"
              titleKey="home.appTitles.walletFeature"
              rating={3.2}
              users="4.8k"
              downloads="70,800 +"
            />
          </div>
        </div>
      </section>

      <footer className="py-10 mt-16 border-t border-gray-200/80 dark:border-gray-800/80">
        <div className="container mx-auto text-center text-gray-500 dark:text-gray-400 text-sm">
          <Trans i18nKey="home.footer.copyright" year={new Date().getFullYear()}>
            © {{year: new Date().getFullYear()}} DooTask.com. All rights reserved. <br />
          </Trans>
          {t('home.footer.illustrativeDesign')}
        </div>
      </footer>
    </div>
  );
}

export default Home;
