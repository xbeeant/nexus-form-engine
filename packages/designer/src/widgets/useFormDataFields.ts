// ============================================================================
// useFormDataFields — 从当前设计器 schema 收集 formData 字段（供变量/依赖选择）
// ============================================================================

import { useMemo } from 'react';
import { useDesigner } from '../DesignerContext';
import { collectDataFieldOptions, collectDataFieldPaths } from '../schemaUtils';

export function useFormDataFields(): string[] {
  const { schema } = useDesigner();
  return useMemo(() => collectDataFieldPaths(schema), [schema]);
}

/** 带字段标题的选项列表：显示 title，值为路径 key（供 dependencies 等选择器） */
export function useFormDataFieldOptions(): Array<{
  value: string;
  label: string;
}> {
  const { schema } = useDesigner();
  return useMemo(() => collectDataFieldOptions(schema), [schema]);
}
