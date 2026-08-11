import type { NexusEngine } from '@nexus/form-engine';
import { useRef } from 'react';

import { FormController } from '../components/FormController';

/**
 * useForm — 创建 Form 实例
 */
export function useForm(engine?: NexusEngine): [FormController] {
  const formRef = useRef<FormController | null>(null);
  if (!formRef.current) {
    formRef.current = new FormController(engine);
  }
  return [formRef.current];
}
