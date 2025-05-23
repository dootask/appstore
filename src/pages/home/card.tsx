import React from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { App } from '@/types/api';

const HomeCard: React.FC<{
  bgColorClass: string;
  iconColorClass: string;
  buttonBgClass: string;
  textColorClass: string;
  cardBgClass: string;
  app: App;
  onSelect: () => void;
}> = ({bgColorClass, iconColorClass, buttonBgClass, textColorClass, cardBgClass, app, onSelect}) => {
  const {t} = useTranslation();

  return (
    <div className={`p-6 rounded-2xl shadow-lg ${cardBgClass} border border-gray-200 dark:border-gray-700 flex flex-col`} onClick={onSelect}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColorClass}`}>
          <img src={app.icon} alt={app.name} className={`w-7 h-7 ${iconColorClass}`} />
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Heart className="w-4 h-4 text-pink-500 dark:text-pink-400 mr-1" fill="currentColor" />
          <span>{app.rating?.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex-grow">
        <h3 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">{app.name}</h3>
        <div className="mb-4 space-y-1 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('home.appDisplayCard.totalUsers')}</span>
            <span className={`font-semibold ${textColorClass}`}>{app.user_count}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('home.appDisplayCard.downloads')}</span>
            <span className={`font-semibold ${textColorClass}`}>{app.downloads}</span>
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

export default HomeCard;
