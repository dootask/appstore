import { create } from 'zustand';
import type { AppItem } from '@/types/app';
import { requestAPI } from '@dootask/tools';
import { Alert } from '@/components/custom/prompt';
import i18n from '@/i18n';

interface AppStoreState {
  apps: AppItem[];
  loading: boolean;
  setApps: (apps: AppItem[]) => void;
  fetchApps: (silence?: boolean) => Promise<void>;
  updateOrAddApp: (app: AppItem) => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  apps: [],
  loading: false,
  setApps: (apps) => set({apps}),
  fetchApps: async (silence = false) => {
    if (!silence) set({loading: true});
    try {
      const {data} = await requestAPI({url: 'apps/list'});
      if (data) set({apps: data});
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
  updateOrAddApp: (app) => {
    const {apps} = get();
    const idx = apps.findIndex(item => item.name === app.name);
    if (idx > -1) {
      const newApps = [...apps];
      newApps[idx] = {...newApps[idx], ...app};
      set({apps: newApps});
    } else {
      set({apps: [...apps, app]});
    }
  },
}));
