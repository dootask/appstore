import { useAppNavigate } from '@/routes';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const navigate = useAppNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen py-20 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        {/* 404 数字动画 */}
        <div className="relative">
          <h1 className="text-7xl sm:text-9xl font-bold text-mantis-600 dark:text-mantis-400 animate-bounce">
            404
          </h1>
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-mantis-500 rounded-full"></div>
        </div>

        {/* 错误信息 */}
        <div className="space-y-4 mt-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {t('notFound.title')}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
            {t('notFound.description')}
          </p>
        </div>

        {/* 返回按钮 */}
        <button
          onClick={() => navigate.toHome()}
          className="inline-flex items-center px-6 py-3 bg-mantis-500 hover:bg-mantis-600 text-white rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <Home className="w-5 h-5 mr-2" />
          {t('notFound.backHome')}
        </button>
      </div>
    </div>
  );
}
