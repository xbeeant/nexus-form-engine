// ── 按设备挑选 widget / layout 实现 ────────────────────────────────────────────
// 在 widget 设计之外提供「同一 widget 名、移动端使用不同的实现」的能力，
// 比如：input 用 antd-mobile 的 Input，select 用 antd-mobile 的 Picker。
// 桌面端默认沿用 `antdWidgets` / `antdLayouts`，用户可通过 `mobileOverrides`
// 注入部分覆盖（其余键继续走 desktop 实现）。

import type { NexusComponent } from '@xbeeant/form-engine';
import { antdLayouts } from '../layouts';
import { type IsMobileOptions, isMobile } from '../utils/device';
import { antdWidgets } from './index';

/** widget / layout 集合项映射 */
export type WidgetMap = Record<string, NexusComponent>;

/** 设备挑选选项 */
export interface PickByDeviceOptions {
  /** 是否移动端；不传则调 `isMobile()` 自动检测 */
  isMobile?: boolean;
  /** 移动端 widget/layout 覆盖项（同 key 优先命中，与 desktop 实现合并） */
  mobileOverrides?: WidgetMap;
  /** 桌面端基线，默认为 ui 包内置 `antdWidgets` / `antdLayouts` */
  desktop?: WidgetMap;
  /** 透传给 `isMobile()` 的额外选项（breakpoint / force） */
  deviceOptions?: IsMobileOptions;
}

/**
 * 选择当前设备应使用的 widgets 集合。
 *
 * - 移动端：`{ ...desktop, ...mobileOverrides }` —— 仅 mobileOverrides 中声明的 key 用 mobile 实现
 * - 桌面端：直接返回 desktop（默认 = `antdWidgets`）
 *
 * @example
 * ```ts
 * import { Picker } from 'antd-mobile';
 * const mobileOverrides = { select: MobileSelectWidget };
 * const widgets = pickAntdWidgets({ isMobile: isMobile(), mobileOverrides });
 * engine.registerWidgets(widgets);
 * ```
 */
export function pickAntdWidgets(options: PickByDeviceOptions = {}): WidgetMap {
  const desktop = options.desktop ?? (antdWidgets as WidgetMap);
  if (options.isMobile ?? isMobile(options.deviceOptions)) {
    return { ...desktop, ...(options.mobileOverrides ?? {}) };
  }
  return { ...desktop };
}

/** 同 `pickAntdWidgets`，作用于布局节点 */
export function pickAntdLayouts(options: PickByDeviceOptions = {}): WidgetMap {
  const desktop = options.desktop ?? (antdLayouts as WidgetMap);
  if (options.isMobile ?? isMobile(options.deviceOptions)) {
    return { ...desktop, ...(options.mobileOverrides ?? {}) };
  }
  return { ...desktop };
}
