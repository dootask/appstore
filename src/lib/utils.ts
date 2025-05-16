import type { AppItem } from "@/types/app"
import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 阻止关闭
 * @returns {boolean} - 返回 true 表示已执行点击，false 表示没有可点击的元素
 */
export function beforeClose(): boolean {
  const containers = [...document.querySelectorAll("[role='app-store-close']")].reverse()
  let maxIndex = -1
  let targetElement: HTMLElement | null = null
  
  for (const container of containers) {
    const zIndex = container.getAttribute("role-index")
    if (zIndex) {
      const index = Number(zIndex)
      if (index > maxIndex) {
        maxIndex = index
        targetElement = container as HTMLElement
      }
    }
  }
  
  if (targetElement) {
    targetElement.click()
    return true
  }
  
  if (containers.length > 0) {
    (containers[0] as HTMLElement).click()
    return true
  }
  
  return false
}

/**
 * 生成UUID
 * @returns {string} - 返回UUID
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

/**
 * 比较版本号
 * @param {string} v1 - 版本号1
 * @param {string} v2 - 版本号2
 * @returns {number} - 返回1表示v1>v2，-1表示v1<v2，0表示相等
 */
export function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

/**
 * 检查应用是否有可升级版本
 * @param {AppItem} app - 应用信息
 * @returns {boolean} - 返回true表示有可升级版本，false表示没有
 */
export function hasUpgradeableVersion(app: AppItem): boolean {
  if (app.config.status !== 'installed' || !app.config.install_version) {
    return false;
  }

  return app.versions.some(version => compareVersions(version.version, app.config.install_version) > 0);
}
