import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 比较两个版本号
 * @param v1 - 第一个版本号
 * @param v2 - 第二个版本号
 * @returns {number} 1: v1 > v2, -1: v1 < v2, 0: v1 = v2
 */
export function compareVersions(v1: string, v2: string): number {
  // 处理空值情况
  if (!v1 || !v2) return 0;

  // 分割版本号并转换为数字数组
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  // 获取最大长度进行比较
  const maxLength = Math.max(v1Parts.length, v2Parts.length);

  // 逐位比较版本号
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] ?? 0;
    const v2Part = v2Parts[i] ?? 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
}
