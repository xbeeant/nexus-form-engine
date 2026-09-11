// ============================================================================
// React 包入口文件（@xbeeant/form-engine-react）
// 导出所有 React 组件、Hooks、Context 和工具函数，供上层应用使用
// ============================================================================

import './styles.css';

// ── 组件 ────────────────────────────────────────────────────────────────────
export { FormController } from './components/form-controller';
export { NexusBranch } from './components/nexus-branch';
export type { NexusAddons } from './components/nexus-field';
export { NexusField } from './components/nexus-field';
export type { NexusFormConfig, NexusFormProps } from './components/nexus-form';
export { NexusForm } from './components/nexus-form';
export { NexusFormProvider } from './components/nexus-form-provider';
export { NexusLayout } from './components/nexus-layout';
export { NexusObject } from './components/nexus-object';

// ── Context ─────────────────────────────────────────────────────────────────
export type { FieldInheritValue } from './contexts/field-inherit-context';
export { FieldInheritContext } from './contexts/field-inherit-context';
export type { GridContextValue } from './contexts/grid-context';
export { GRID_TOTAL, GridContext } from './contexts/grid-context';
export type { LayoutConfigContextValue } from './contexts/layout-config-context';
export { LayoutConfigContext } from './contexts/layout-config-context';
export { NexusContext, useNexusContext } from './contexts/nexus-context';

// ── Hooks ───────────────────────────────────────────────────────────────────
export { useEngine } from './hooks/use-engine';
export { useFieldState } from './hooks/use-field-state';
export { useFieldValidator } from './hooks/use-field-validator';
export { useFieldValue } from './hooks/use-field-value';
export { useForm } from './hooks/use-form';
export { useFormConfig } from './hooks/use-form-config';
export { useFormData } from './hooks/use-form-data';
export { useFormSubmitting } from './hooks/use-form-submitting';
export { useWatch } from './hooks/use-watch';
export { useWatchAll } from './hooks/use-watch-all';
export { useWatchMultiple } from './hooks/use-watch-multiple';
export { useWatchState } from './hooks/use-watch-state';

// ── 工具函数 ────────────────────────────────────────────────────────────────
export { buildWidgetProps } from './utils/build-widget-props';

export {
  pureHtmlString,
  reactNodeFromString,
} from './utils/react-node-from-string';

export { resolveReadOnlyWidget } from './utils/resolve-readonly-widget';
