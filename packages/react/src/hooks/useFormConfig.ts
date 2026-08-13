import type { NexusFormConfig } from '../components/NexusForm.tsx';
import { useNexusContext } from '../contexts/NexusContext';

/**
 * useFormConfig — 获取表单布局配置
 */
export function useFormConfig(): NexusFormConfig {
  const { config } = useNexusContext();
  return config;
}
