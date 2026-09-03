import type { NexusFormConfig } from '../components/nexus-form';
import { useNexusContext } from '../contexts/nexus-context';

/**
 * useFormConfig — 获取表单布局配置
 */
export function useFormConfig(): NexusFormConfig {
  const { config } = useNexusContext();
  return config;
}
