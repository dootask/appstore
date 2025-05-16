import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import Icon from '../assets/icon.svg'
import {useTranslation} from "react-i18next";
import type { AppStatus } from "@/types/app";

interface AppCardProps {
  icon?: string;
  title: string;
  description: string;
  status: string;
  upgradeable?: boolean;
  category?: string | string[];
  onOpen?: () => void;
}

export function AppCard({icon, title, description, status, upgradeable, category, onOpen}: AppCardProps) {
  const {t} = useTranslation();

  return (
    <Card
      className="flex flex-col overflow-hidden border px-2 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onOpen}
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-md">
              {icon ? (
                <div className="relative h-10 w-10">
                  <img src={icon} alt={title} className="object-cover rounded-md" />
                </div>
              ) : (
                <div className="relative h-10 w-10">
                  <img src={Icon} alt={title} className="object-cover rounded-md" />
                </div>
              )}
            </div>
            <div className="ml-3 min-h-12 flex flex-col justify-center">
              <h3 className="font-medium">{title}</h3>
              {category && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Array.isArray(category) ? (
                    category.map((cat, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{cat}</Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs">{category}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md relative ${(() => {
            if (upgradeable) {
              return "bg-purple-100 text-purple-700"
            }
            const statusClass: Record<AppStatus, string> = {
              installing: "bg-blue-100 text-blue-700",
              installed: "bg-gray-100 text-gray-400",
              uninstalling: "bg-orange-100 text-orange-700",
              not_installed: "bg-green-100 text-green-700",
              error: "bg-red-100 text-red-700",
            }
            return statusClass[status as AppStatus] || statusClass.not_installed
          })()} whitespace-nowrap cursor-pointer`}>
            {t('app.' + (() => {
              if (upgradeable) {
                return 'upgradeable'
              }
              const statusDisplay: Record<AppStatus, string> = {
                installing: 'installing',
                installed: 'installed',
                uninstalling: 'uninstalling',
                not_installed: 'install',
                error: 'error'
              }
              return statusDisplay[status as AppStatus] || 'install'
            })())}
            {upgradeable && (
              <div className="absolute -top-0.5 -right-0.5 size-2 bg-red-500 rounded-full"></div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-grow">
        <p className="text-sm text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}
