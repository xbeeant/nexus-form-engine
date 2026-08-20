import type { NexusEngine } from '@xbeeant/form-engine';
import { createContext, type ReactNode, useContext } from 'react';

import type { FormController } from '../components/FormController';

// ────────────────────────────────────────────────────────────────────────────
// Form 布局配置
// ────────────────────────────────────────────────────────────────────────────

export interface NexusFormConfig {
  /** label 列配置（由 ui 层 Form.Item 消费） */
  labelCol?: Record<string, unknown>;
  /** label 宽度（px 或 %），快捷方式 — 映射到 labelCol.style.width */
  labelWidth?: number | string;
  /** 是否显示冒号 */
  colon?: boolean | ReactNode;
  /** 是否显示 label（默认 true） */
  label?: boolean;
  /** 表单布局方向 */
  displayType?: 'row' | 'column' | 'inline';
  /** 整个表单只读，所有字段以文本展示 */
  readOnly?: boolean;
  /** 表单每行显示多少列 */
  column?: number;
  /** 表单语言标识（如 'zh-CN' / 'en-US'，ui 层消费：antd locale + 内置文案） */
  locale?: string;
}

interface NexusContextValue {
  engine: NexusEngine;
  config: NexusFormConfig;
  form: FormController;
}

export const NexusContext = createContext<NexusContextValue | null>(null);

export function useNexusContext(): NexusContextValue {
  const ctx = useContext(NexusContext);
  if (!ctx) {
    throw new Error('[NexusField] Must be used within <NexusFormProvider>');
  }
  return ctx;
}
