import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS 类名
 * @param inputs - 输入的类名
 * @returns {string} - 合并后的类名
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * 获取 URL 参数
 * @param param - 参数名
 * @returns {string | null} - 返回参数值或 null
 */
export function getUrlParam(param: string): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
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

/**
 * 复制文本
 * @param content - 要复制的文本
 * @returns {Promise<void>} - 返回 Promise 对象
 */
export async function copyText(content: string): Promise<void> {
  const unsecuredCopyToClipboard = (text: string): void => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (err) {
      throw err;
    } finally {
      document.body.removeChild(textArea);
    }
  };

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(content);
    } else {
      unsecuredCopyToClipboard(content);
    }
  } catch (err) {
    throw err;
  }
}