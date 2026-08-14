// ============================================================================
// @nexus/form-engine-designer — 属性面板专用 Widget 注册
// ============================================================================

import type { ReactNode } from 'react';
import { bindEditorWidget } from './BindEditor';
import { defaultEditorWidget } from './DefaultEditor';
import { dependenciesEditorWidget } from './DependenciesEditor';
import { enumEditorWidget, enumNamesEditorWidget } from './EnumEditor';
import { expressionSwitchWidget } from './ExpressionSwitch';
import { optionsEditorWidget } from './OptionsEditor';
import { reactionsEditorWidget } from './ReactionsEditor';
import { validateEditorWidget } from './ValidateEditor';

/** 属性面板专用的 widget 集合，注册到属性表单的引擎实例中 */
export const propertyWidgets: Record<string, (props: any) => ReactNode> = {
  propertyExpr: expressionSwitchWidget,
  propertyBind: bindEditorWidget,
  propertyValidate: validateEditorWidget,
  propertyDependencies: dependenciesEditorWidget,
  propertyReactions: reactionsEditorWidget,
  propertyEnum: enumEditorWidget,
  propertyEnumNames: enumNamesEditorWidget,
  propertyOptions: optionsEditorWidget,
  propertyDefault: defaultEditorWidget,
};

export { bindEditorWidget } from './BindEditor';
export { defaultEditorWidget } from './DefaultEditor';
export { dependenciesEditorWidget } from './DependenciesEditor';
export { enumEditorWidget, enumNamesEditorWidget } from './EnumEditor';
export type { ExpressionBuilderProps } from './ExpressionBuilder';
export { ExpressionBuilder } from './ExpressionBuilder';
export { expressionSwitchWidget } from './ExpressionSwitch';
export * from './expressionModel';
export { optionsEditorWidget } from './OptionsEditor';
export { reactionsEditorWidget } from './ReactionsEditor';
export { useFormDataFields } from './useFormDataFields';
export { validateEditorWidget } from './ValidateEditor';
