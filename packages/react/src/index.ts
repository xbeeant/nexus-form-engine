// ============================================================================
// React包入口文件
// 导出所有React组件、Hooks和类型定义，供上层应用使用
// ============================================================================

import './styles.css';

export { FormController } from './components/form-controller';
export { NexusBranch } from './components/nexus-branch';
export { NexusField } from './components/nexus-field';
export type { NexusFormConfig, NexusFormProps } from './components/nexus-form';
export { NexusForm } from './components/nexus-form';
export { NexusFormProvider } from './components/nexus-form-provider';
export { NexusLayout } from './components/nexus-layout';
export { NexusObject } from './components/nexus-object';
export type { FieldInheritValue } from './contexts/field-inherit-context';
export { FieldInheritContext } from './contexts/field-inherit-context';
export type { GridContextValue } from './contexts/grid-context';
export { GridContext } from './contexts/grid-context';
export type { LayoutConfigContextValue } from './contexts/layout-config-context';
export { LayoutConfigContext } from './contexts/layout-config-context';
export { NexusContext } from './contexts/nexus-context';

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
