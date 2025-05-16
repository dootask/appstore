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
