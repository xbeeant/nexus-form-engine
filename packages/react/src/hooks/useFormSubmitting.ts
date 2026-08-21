import { useSyncExternalStore } from 'react';

import type { FormController } from '../components/FormController';

/**
 * useFormSubmitting — 订阅表单提交中状态（formily submitting 对齐）
 *
 * submit() 全流程（校验 + onFinish）期间返回 true，供提交按钮展示 loading。
 */
export function useFormSubmitting(form: FormController): boolean {
  return useSyncExternalStore(
    (cb) => form.onSubmittingChange(cb),
    () => form.getSubmitting(),
    () => form.getSubmitting(),
  );
}
