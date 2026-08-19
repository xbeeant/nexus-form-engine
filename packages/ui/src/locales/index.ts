import type { Locale as AntdLocale } from 'antd/es/locale';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';

// ────────────────────────────────────────────────────────────────────────────
// i18n 语言包 — 表单引擎内置文案 + antd locale 映射
// 语言标识约定：BCP 47（'zh-CN' / 'en-US'），缺省 zh-CN
// ────────────────────────────────────────────────────────────────────────────

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

/** antd 组件库 locale 映射（ConfigProvider 消费） */
export const antdLocales: Record<string, AntdLocale> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

/** 归一化语言标识：未知 locale 回退 'zh-CN' */
export function normalizeLocale(locale?: string): string {
  if (!locale) {
    return 'zh-CN';
  }
  return nexusLocales[locale] ? locale : 'zh-CN';
}

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
