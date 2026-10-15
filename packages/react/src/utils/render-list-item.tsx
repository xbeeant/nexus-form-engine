import type { DataFieldSchema } from '@xbeeant/form-engine';
import { isExpressionString } from '@xbeeant/form-engine';
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { LayoutConfigContext } from '../contexts/layout-config-context';
import { useNexusContext } from '../contexts/nexus-context';
import { useImperativeValidator } from '../hooks/use-imperative-validator';
import { buildWidgetProps } from './build-widget-props';
import { inferWidget } from './infer-widget';
import { resolveReadOnlyWidget } from './resolve-readonly-widget';

/**
 * 列表项字段渲染函数
 *
 * 不经过 NexusField（NexusField 在字段无 fieldState 时直接返回 null），
 * 直接复用 widget resolution + buildWidgetProps 逻辑。
 *
 * @param props - 字段渲染参数
 * @param suppressWrapper - 是否抑制 FieldWrapper（默认 false，列表项传 true）
 * @returns ReactNode
 */
export function renderListItemField(
  props: {
    /** 可以为 undefined（占位行），此时使用占位路径 */
    path?: string;
    fieldSchema: DataFieldSchema;
    value: unknown;
    onChange?: (v: unknown) => void;
    readOnly?: boolean;
    disabled?: boolean;
    placeholder?: string;
  },
  suppressWrapper: boolean = false,
): ReactNode {
  const path = props.path ?? '__placeholder__';
  const content = (
    <RenderItemWidget
      path={path}
      fieldSchema={props.fieldSchema}
      value={props.value}
      onChange={props.onChange}
      readOnly={props.readOnly}
      disabled={props.disabled}
      placeholder={props.placeholder}
    />
  );
  if (!suppressWrapper) {
    return content;
  }
  return (
    <LayoutConfigContext.Consumer>
      {(ctx) => (
        <LayoutConfigContext.Provider
          value={{ ...ctx, suppressFieldItemLayout: true }}
        >
          {content}
        </LayoutConfigContext.Provider>
      )}
    </LayoutConfigContext.Consumer>
  );
}

function RenderItemWidget({
  path,
  fieldSchema,
  value,
  onChange,
  readOnly,
  disabled,
  placeholder,
}: {
  path: string;
  fieldSchema: DataFieldSchema;
  value: unknown;
  onChange?: (v: unknown) => void;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
}): ReactNode {
  const { engine, form } = useNexusContext();

  // 按项字段路径精准订阅，readOnly/disabled 等状态变化实时重渲染
  const fieldVersion = engine.getFieldVersion(path);
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(path, onStoreChange),
    () => fieldVersion,
    () => fieldVersion,
  );

  // widget 命令式校验器：注册到引擎参与实时校验与提交校验
  const fieldRef = useImperativeValidator(form, path, fieldVersion);

  // 读取引擎维护的字段状态（含表达式联动解析后的 readOnly/disabled/required 等）
  const fieldState = engine.getFieldState(path);

  // 计算 addon 依赖的值
  const indexMatch = path.match(/\[(\d+)\]/);
  const index = indexMatch ? Number(indexMatch[1]) : undefined;
  const arrayPath = path.slice(0, path.indexOf('['));

  // readOnly/disabled：列表容器传入与项字段引擎状态取并集
  const finalReadOnly = (readOnly || fieldState?.readOnly || false) as boolean;
  const finalDisabled = (disabled || fieldState?.disabled || false) as boolean;

  // widget 名：优先引擎解析结果，其次显式声明 / type / format 推断
  const baseWidget =
    fieldState?.meta.widget ??
    inferWidget({
      type: fieldSchema.type,
      format: fieldSchema.format,
      widget: fieldSchema.widget,
    });

  // readOnly 模式 widget 选择（与 NexusField 共享 resolveReadOnlyWidget）
  const { widgetName, wantReadOnlyWidget } = resolveReadOnlyWidget(
    {
      baseWidget,
      readOnlyWidget:
        fieldState?.meta.readOnlyWidget ?? fieldSchema.readOnlyWidget,
      schemaType: fieldSchema.type,
      schemaWidget: fieldSchema.widget,
    },
    finalReadOnly,
  );

  let Widget = engine.getWidget(widgetName);
  if (!Widget && wantReadOnlyWidget) {
    Widget = engine.getWidget(baseWidget);
  }

  // 字段被隐藏时（hidden 联动 / 祖先继承），渲染 display:none 占位符
  if (engine.isHidden(path, fieldState)) {
    return <div className='hidden' data-nexus-hidden={path} />;
  }

  if (!Widget) {
    return (
      <div className='text-xs text-red-500' data-nexus-field={path}>
        ⚠️ Widget "{fieldSchema.widget}" 未注册 (path: {path})
      </div>
    );
  }

  // 从 enum/enumNames 构建选项
  const finalOptions = buildItemOptions(
    fieldState?.meta.enum ?? fieldSchema.enum,
    fieldState?.meta.enumNames ?? fieldSchema.enumNames,
  );

  const finalPlaceholder =
    fieldState?.meta.placeholder ??
    placeholder ??
    safeSchemaString(fieldSchema.placeholder);
  const finalProps =
    fieldState?.props ?? safeSchemaProps(fieldSchema.props) ?? {};

  // 构建 widget props
  const _rawWidgetProps: Record<string, unknown> = {
    ...buildWidgetProps(
      {
        schema: fieldSchema,
        disabled: finalDisabled,
        readOnly: finalReadOnly,
        required: fieldState?.required,
        loading: fieldState?.loading,
        placeholder: finalPlaceholder,
        options: finalOptions,
        addonsValue: value,
        addonsIndex: index,
        addonsItemOf: arrayPath,
        addonsFieldRef: fieldRef,
      },
      {
        dataPath: path,
        path,
        value,
        onChange: onChange ?? (() => {}),
        form,
      },
    ),
    ...finalProps,
  };

  // 过滤 undefined
  const widgetProps: Record<string, unknown> = {};
  for (const key of Object.keys(_rawWidgetProps)) {
    if (_rawWidgetProps[key] !== undefined) {
      widgetProps[key] = _rawWidgetProps[key];
    }
  }

  return <Widget {...widgetProps} />;
}

// ────────────────────────────────────────────────────────────────────────────
// 辅助函数
// ────────────────────────────────────────────────────────────────────────────

/** 将 enum/enumNames 归一为选项数组 */
function buildItemOptions(
  enumValues?: Array<string | number> | string,
  enumNames?: Array<string> | string,
) {
  const values = Array.isArray(enumValues) ? enumValues : undefined;
  if (!values) {
    return undefined;
  }
  const names = Array.isArray(enumNames) ? enumNames : undefined;
  return values.map((v, i) => ({
    value: v,
    label: names?.[i] ?? String(v),
  }));
}

/** 引擎状态缺失时回退 schema 静态值时，剔除仍以 `{{ }}` 表达式形式出现的值 */
function safeSchemaString(value: unknown): string | undefined {
  if (typeof value === 'string' && !isExpressionString(value)) {
    return value;
  }
  return undefined;
}

function safeSchemaProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!props) {
    return undefined;
  }
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isExpressionString(value)) {
      continue;
    }
    filtered[key] = value;
  }
  return filtered;
}
