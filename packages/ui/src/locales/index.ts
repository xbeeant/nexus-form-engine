// ────────────────────────────────────────────────────────────────────────────
// i18n 语言包 — 表单引擎内置文案 + antd locale 映射
// 语言标识约定：BCP 47（'zh-CN' / 'en-US'），缺省 zh-CN
// ⚠️ 必须走 antd/es/locale/* 的纯 ESM 直出路径（export default localeValues）；
//    antd/locale/* 在 antd@6 是 CJS 桥接（module.exports = require('../lib/locale/...')），
//    底层 CJS 以 { __esModule: true, default: localeValues } 形式导出，Vite/Vitest 等
//    不同环境的 CJS↔ESM 互操作不一致，会导致 ConfigProvider.locale 被包一层 default。
// ────────────────────────────────────────────────────────────────────────────

import type { Locale as AntdLocale } from 'antd/es/locale';
import enUS from 'antd/es/locale/en_US';
import zhCN from 'antd/es/locale/zh_CN';

export interface NexusLocaleBundle {
  /** 只读展示内置文案 */
  readonlyDisplay: {
    yes: string;
    no: string;
  };
}

export const nexusLocales: Record<string, NexusLocaleBundle> = {
  'zh-CN': {
    readonlyDisplay: { yes: '是', no: '否' },
  },
  'en-US': {
    readonlyDisplay: { yes: 'Yes', no: 'No' },
  },
};

/** 归一化语言标识：未知 locale 回退 'zh-CN' */
export function normalizeLocale(locale?: string): string {
  if (!locale) {
    return 'zh-CN';
  }
  return nexusLocales[locale] ? locale : 'zh-CN';
}

/**
 * 安全解包 antd locale：防御性兼容 CJS↔ESM 互操作差异。
 * - ESM 直出路径下：unwrap 出来的就是 Locale 对象本身，行为无变化。
 * - CJS 互操作异常包裹 default 的环境下：unwrap 出真正的 Locale 对象，避免
 *   ConfigProvider.locale 收到 `{ default: Locale }` 形式导致 antd 静默忽略语言包。
 */
function unwrapAntdLocale(value: unknown): AntdLocale {
  if (
    value &&
    typeof value === 'object' &&
    'default' in (value as Record<string, unknown>) &&
    (value as Record<string, unknown>).default &&
    typeof (value as Record<string, unknown>).default === 'object' &&
    'locale' in
      ((value as Record<string, unknown>).default as Record<string, unknown>)
  ) {
    return (value as { default: AntdLocale }).default;
  }
  return value as AntdLocale;
}

/** antd 组件库 locale 映射（ConfigProvider 消费） */
export const antdLocales: Record<string, AntdLocale> = {
  'zh-CN': unwrapAntdLocale(zhCN),
  'en-US': unwrapAntdLocale(enUS),
};

/** 获取语言包（未知 locale 回退中文包） */
export function resolveNexusLocale(locale?: string): NexusLocaleBundle {
  return nexusLocales[normalizeLocale(locale)];
}

/** 获取 antd locale 对象（未知 locale 回退中文） */
export function resolveAntdLocale(locale?: string): AntdLocale {
  return antdLocales[normalizeLocale(locale)];
}

/** 规范化语言标识到 antd 可识别的 BCP 47 格式（'zh-CN' → 'zh_CN'） */
export function toAntdLocaleName(locale?: string): string {
  return normalizeLocale(locale).replace('-', '_');
}
