'use client'

import { useEffect, useState } from "react";
import { eventOn } from "@/lib/events";
import { uuidv4 } from "@/lib/utils";
import { nextZIndex } from "@dootask/tools";
import { Portal } from "./portal";
import ToasterItem from "./toaster-item";

/**
 * Toaster 组件 - 用于显示轻量级的反馈信息。
 *
 * 支持多种类型的消息（成功、警告、错误、信息、纯文本），可自定义显示时长、内容和位置。
 * 通过事件系统触发显示，支持自动关闭。
 *
 * @example
 * ```tsx
 * // 基本用法
 * import { eventEmit } from '@/lib/events'
 *
 * // 普通消息
 * eventEmit('toaster', {
 *   content: '一条新的消息'
 * })
 *
 * // 警告消息，从底部弹出
 * eventEmit('toaster', {
 *   type: 'warning',
 *   content: '请注意...',
 *   direction: 'bottom',
 *   duration: 5000 // 5秒后自动关闭
 * })
 * ```
 */

export type ToasterDirection = "top" | "bottom" | "middle";
export type ToasterType = "success" | "warning" | "error" | "info" | "text";

export interface ToasterProps {
  /** 消息内容 */
  content: string;
  /** 消息类型 */
  type?: ToasterType;
  /** 显示时长（毫秒），默认 3000 */
  duration?: number;
  /** 显示位置，默认 'top' */
  direction?: ToasterDirection;
  /** 自定义层级 */
  zIndex?: number;
  /** 关闭回调函数 */
  onClose?: () => void;

  /** 内部使用：是否正在关闭 */
  __closeIng?: boolean;
}

/** @internal 内部使用的接口，用于管理 Toaster 实例 */
export interface __ToasterItem extends ToasterProps {
  /** 唯一标识 */
  id: string;
  /** 关闭后的回调 */
  afterClose: () => void;
}

export default function ToasterPortal() {
  const [toasters, setToasters] = useState<__ToasterItem[]>([]);
  const [zIndex, setZIndex] = useState(0);

  useEffect(() => {
    const off = eventOn("toaster", (args: unknown) => {
      const item = args as __ToasterItem;
      if (item.__closeIng) {
        setToasters(prev => prev.map(toaster =>
          toaster.id === item.id ? {...toaster, __closeIng: true} : toaster
        ));
        return;
      }
      item.id = item.id ?? uuidv4();
      item.duration = item.duration ?? 3000;
      item.direction = item.direction ?? "top";
      item.type = item.type ?? "info";
      item.zIndex = Math.max(zIndex, item.zIndex ?? (nextZIndex() + 2000)); // Toaster zIndex 基础值设置为2000
      item.afterClose = () => setToasters(prev => prev.filter(({id}) => id !== item.id));
      
      setToasters(prev => {
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

  if (toasters.length === 0) return null;

  const getPositionClasses = (direction: ToasterDirection = "top") => {
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

  // 将 toasters 按 direction 分组
  const groupedToasters: Record<ToasterDirection, __ToasterItem[]> = {
    top: [],
    bottom: [],
    middle: [],
  };

  toasters.forEach(toaster => {
    groupedToasters[toaster.direction ?? 'top'].push(toaster);
  });

  return (
    <Portal>
      {Object.entries(groupedToasters).map(([direction, items]) => {
        if (items.length === 0) return null;
        return (
          <div
            key={direction}
            aria-live="assertive"
            className={`pointer-events-none ${getPositionClasses(direction as ToasterDirection)}`}
            style={{ zIndex: zIndex }} //  确保不同 direction 的 toaster 容器 zIndex 一致，由 ToasterItem 自身控制具体层级
          >
            {items.map((item) => (
              <ToasterItem key={item.id} {...item} />
            ))}
          </div>
        );
      })}
    </Portal>
  );
} 