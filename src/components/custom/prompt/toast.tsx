'use client'

import { useEffect, useState } from "react";
import { eventOn } from "@/lib/events";
import { uuidv4 } from "@/lib/utils";
import { nextZIndex } from "@dootask/tools";
import { Portal } from "./portal";
import ToastItem from "./toast-item";

export type ToastDirection = "top" | "bottom" | "middle";
export type ToastType = "success" | "warning" | "error" | "info" | "text";

export interface ToastProps {
  /** 消息内容 */
  content: string;
  /** 消息类型 */
  type?: ToastType;
  /** 显示时长（毫秒），默认 3000 */
  duration?: number;
  /** 显示位置，默认 'top' */
  direction?: ToastDirection;
  /** 自定义层级 */
  zIndex?: number;
  /** 关闭回调函数 */
  onClose?: () => void;

  /** 内部使用：是否正在关闭 */
  __closeIng?: boolean;
}

/** @internal 内部使用的接口，用于管理 Toast 实例 */
export interface __ToastItem extends ToastProps {
  /** 唯一标识 */
  id: string;
  /** 关闭后的回调 */
  afterClose: () => void;
}

export default function ToastPortal() {
  const [toasts, setToasts] = useState<__ToastItem[]>([]);
  const [zIndex, setZIndex] = useState(0);

  useEffect(() => {
    const off = eventOn("toast", (args: unknown) => {
      const item = args as __ToastItem;
      if (item.__closeIng) {
        setToasts(prev => prev.map(toast =>
          toast.id === item.id ? {...toast, __closeIng: true} : toast
        ));
        return;
      }
      item.id = item.id ?? uuidv4();
      item.duration = item.duration ?? 3000;
      item.direction = item.direction ?? "top";
      item.type = item.type ?? "info";
      item.zIndex = Math.max(zIndex, item.zIndex ?? (nextZIndex() + 2000)); // Toast zIndex 基础值设置为2000
      item.afterClose = () => setToasts(prev => prev.filter(({id}) => id !== item.id));
      
      setToasts(prev => {
        // 根据 direction 将新消息插入到不同位置
        if (item.direction === 'bottom') {
          return [...prev, item]; // 底部消息追加到末尾
        }
        return [item, ...prev]; // 顶部和中间消息插入到开头
      });
      setZIndex(item.zIndex);
    });
    return () => {
      off();
    };
  }, [zIndex]);

  if (toasts.length === 0) return null;

  const getPositionClasses = (direction: ToastDirection = "top") => {
    switch (direction) {
      case "top":
        return "fixed inset-x-0 top-0 flex flex-col items-center px-4 py-6 sm:p-6";
      case "bottom":
        return "fixed inset-x-0 bottom-0 flex flex-col-reverse items-center px-4 py-6 sm:p-6";
      case "middle":
        return "fixed inset-0 flex flex-col items-center justify-center px-4 py-6 sm:p-6";
      default:
        return "fixed inset-x-0 top-0 flex flex-col items-center px-4 py-6 sm:p-6";
    }
  };

  // 将 toasts 按 direction 分组
  const groupedToasts: Record<ToastDirection, __ToastItem[]> = {
    top: [],
    bottom: [],
    middle: [],
  };

  toasts.forEach(toast => {
    groupedToasts[toast.direction ?? 'top'].push(toast);
  });

  return (
    <Portal>
      {Object.entries(groupedToasts).map(([direction, items]) => {
        if (items.length === 0) return null;
        return (
          <div
            key={direction}
            aria-live="assertive"
            className={`pointer-events-none ${getPositionClasses(direction as ToastDirection)}`}
            style={{ zIndex: zIndex }} //  确保不同 direction 的 toast 容器 zIndex 一致，由 ToastItem 自身控制具体层级
          >
            {items.map((item) => (
              <ToastItem key={item.id} {...item} />
            ))}
          </div>
        );
      })}
    </Portal>
  );
}