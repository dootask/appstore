import type { App } from '@/types/api';

export default function AppDetail({app}: {app: App | null}) {
  if (!app) {
    return null;
  }

  return (
    <div>
      <h1>{app.name}</h1>
    </div>
  );
}