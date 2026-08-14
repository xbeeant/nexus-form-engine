// ============================================================================
// useFormDataFields — 从当前设计器 schema 收集 formData 字段路径（供变量选择）
// ============================================================================

import { useMemo } from 'react';
import { useDesigner } from '../DesignerContext';
import { collectDataFieldPaths } from '../schemaUtils';

export function useFormDataFields(): string[] {
  const { schema } = useDesigner();
  return useMemo(() => collectDataFieldPaths(schema), [schema]);
}
