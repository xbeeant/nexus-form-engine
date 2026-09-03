// ============================================================================
// @xbeeant/form-engine-designer — 属性面板专用 Widget 注册
// ============================================================================

import type { ReactNode } from 'react';
import { bindEditorWidget } from './bind-editor';
import { codeEditorWidget } from './code-editor';
import { defaultEditorWidget } from './default-editor';
import { dependenciesEditorWidget } from './dependencies-editor';
import { enumEditorWidget, enumNamesEditorWidget } from './enum-editor';
import { expressionSwitchWidget } from './expression-switch';
import { optionsEditorWidget } from './options-editor';
import { reactionsEditorWidget } from './reactions-editor';
import { remoteDataEditorWidget } from './remote-data-editor';
import { validateEditorWidget } from './validate-editor';

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
  propertyRemoteData: remoteDataEditorWidget,
  propertyCodeEditor: codeEditorWidget,
  propertyDefault: defaultEditorWidget,
};

export { bindEditorWidget } from './bind-editor';
export { codeEditorWidget } from './code-editor';
export { defaultEditorWidget } from './default-editor';
export { dependenciesEditorWidget } from './dependencies-editor';
export { enumEditorWidget, enumNamesEditorWidget } from './enum-editor';
export type { ExpressionBuilderProps } from './expression-builder';
export { ExpressionBuilder } from './expression-builder';
export * from './expression-model';
export { expressionSwitchWidget } from './expression-switch';
export { optionsEditorWidget } from './options-editor';
export { reactionsEditorWidget } from './reactions-editor';
export { remoteDataEditorWidget } from './remote-data-editor';
export { useFormDataFields } from './use-form-data-fields';
export { validateEditorWidget } from './validate-editor';
