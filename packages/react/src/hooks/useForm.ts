import { NexusEngine } from '@xbeeant/form-engine';
import { useRef } from 'react';

import { FormController } from '../components/FormController';

/**
 * useForm — 创建 Form 实例
 *
 * 一个 Form 绑定一个引擎宿主（引擎为独立实体）：
 * - 同一 form 引用传给多个 NexusForm → 共享引擎宿主（组件/插件注册共享），
 *   每个 NexusForm 挂载自动获得独立实例（schema/值/订阅互不影响），
 *   form 的 API 聚合作用于全部实例
 * - 需要完全独立的表单：各自 useForm()（独立引擎宿主）
 *
 * 支持：
 * - `useForm()`：创建独立实例（引擎宿主内部创建，未注册，不参与跨表单联动）
 * - `useForm(formId)`：创建带 formId 的实例，自动注册到默认表单注册表，
 *   可通过 schema `crossForm` reaction / `engine.linkForm` 与其他表单联动
 * - `useForm(formId, engine)`：复用外部创建的引擎（如 `new NexusEngine({ formId })`），
 *   实现多个 form 共享同一引擎宿主
 *
 * @param formId - 可选，表单实例唯一标识（跨表单联动寻址）
 * @param engine - 可选，外部引擎宿主（缺省内部创建）
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
