import { create } from 'zustand';
import type { App } from '@/types/api';
import { Alert } from '@/components/custom/prompt';
import i18n from '@/i18n';
import { AppApi } from "@/lib";

interface AppStoreState {
  baseUrl: string;

  apps: App[];
  loading: boolean;
  setApps: (apps: App[]) => void;

  fetchApps: (silence?: boolean, appIds?: string[]) => Promise<void>;
  fetchApp: (appId: string) => Promise<void>;

  categories: string[];
  updateCategories: () => void;  // 获取应用列表后，更新应用类别
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  baseUrl: import.meta.env.BASE_URL || '/',
  
  apps: [],
  loading: false,
  setApps: (apps) => set({apps}),
  fetchApps: async (silence = false, appIds?: string[]) => {
    if (!silence) set({loading: true});
    try {
      const {data} = await AppApi.getAppList(appIds);
      if (data) {
        if (appIds?.length) {
          // 更新现有列表
          const {apps} = get();
          const newApps = [...apps];
          data.forEach(app => {
            const idx = newApps.findIndex(item => item.id === app.id);
            if (idx > -1) {
              newApps[idx] = {...newApps[idx], ...app};
            } else {
              newApps.push(app);
            }
          });
          set({apps: newApps});
        } else {
          // 设置新列表
          set({apps: data});
          get().updateCategories();
        }
      }
    } catch (e) {
      if (!silence) {
        Alert({
          type: 'error',
          title: i18n.t('common.title'),
          description: i18n.t('app.err_list'),
          showCancel: false,
        });
      }
      console.error(e);
    } finally {
      if (!silence) set({loading: false});
    }
  },
  fetchApp: async (appId: string) => {
    const {data} = await AppApi.getAppDetail(appId);
    if (data) {
      const {apps} = get();
      const idx = apps.findIndex(item => item.id === appId);
      if (idx > -1) {
        const newApps = [...apps];
        newApps[idx] = {...newApps[idx], ...data};
        set({apps: newApps});
      }
    }
  },

  categories: ['all'],
  updateCategories: () => {
    const {apps} = get();
    const allTags = apps.flatMap(app => app.tags || []);
    const uniqueTags = [...new Set(allTags)].filter(tag => tag.trim() !== '');
    const shuffledTags = uniqueTags.sort(() => Math.random() - 0.5);
    const limitedTags = shuffledTags.slice(0, 20);
    set({categories: ['all', ...limitedTags]});
  },
}));
