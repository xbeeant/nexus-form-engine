import { NexusEngine } from '@xbeeant/form-engine';
import { useRef } from 'react';

import { FormController } from '../components/FormController';

/**
 * useForm — 创建 Form 实例
 *
 * 支持一个页面挂载多个表单实例：
 * - `useForm()`：独立实例（未注册，不参与跨表单联动）
 * - `useForm(formId)`：创建带 formId 的实例，自动注册到默认表单注册表，
 *   可通过 schema `crossForm` reaction / `engine.linkForm` 与其他表单联动
 * - `useForm(formId, engine)`：复用外部创建的引擎（如 `new NexusEngine({ formId })`）
 *
 * @param formId - 可选，表单实例唯一标识（跨表单联动寻址）
 * @param engine - 可选，外部引擎实例（缺省内部创建）
 */
export function useForm(
  formId?: string,
  engine?: NexusEngine,
): [FormController] {
  const formRef = useRef<FormController | null>(null);
  if (!formRef.current) {
    formRef.current = new FormController(
      engine ?? (formId ? new NexusEngine({ formId }) : undefined),
    );
  }
  return [formRef.current];
}
