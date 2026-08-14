import type { RenderTreeNode } from '@nexus/form-engine';
import type { CSSProperties, FocusEvent } from 'react';
import { useCallback, useContext, useSyncExternalStore } from 'react';
import { FieldInheritContext } from '../contexts/FieldInheritContext';
import { GridContext } from '../contexts/GridContext';
import { LayoutConfigContext } from '../contexts/LayoutConfigContext';
import { useNexusContext } from '../contexts/NexusContext.ts';
import { resolveColSpan } from '../utils/resolveColSpan';

interface NexusFieldProps {
  dataPath: string;
  layoutKey: string;
}

/**
 * NexusField — 单个字段渲染器
 */
export function NexusField({
  dataPath,
  layoutKey,
}: NexusFieldProps & { node?: RenderTreeNode }) {
  const { engine, config, form } = useNexusContext();
  // 按路径精准订阅：仅该字段版本变化时重渲染（reaction 影响其他字段不会触发本组件）
  // 第三个参数 getServerSnapshot 与 getSnapshot 一致（引擎状态同步，SSR 必需）
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(dataPath, onStoreChange),
    () => engine.getFieldVersion(dataPath),
    () => engine.getFieldVersion(dataPath),
  );
  const state = engine.getFieldState(dataPath);
  // GridContext 必须在所有 early return 之前调用，否则会破坏 Hooks 调用顺序
  const gridCtx = useContext(GridContext);
  const layoutConfig = useContext(LayoutConfigContext);
  // 祖先对象容器（NexusObject）下发的继承属性：visible=false 时子树整体隐藏
  const inherit = useContext(FieldInheritContext);

  const handleChange = useCallback(
    (value: unknown) => {
      engine.setFieldValue(dataPath, value);
    },
    [engine, dataPath],
  );

  // 失焦触发 blur 规则校验（trigger: 'blur'）：
  // React onBlur 冒泡（focusout 语义），包裹层统一处理内部控件失焦；
  // 焦点仍在字段内部（如 dateRange 双输入框间切换）时跳过。
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      engine.validateField(dataPath, { trigger: 'blur' });
    },
    [engine, dataPath],
  );

  if (!state) {
    // 仅当引擎已初始化（version > 0）但字段仍未找到时才发出警告
    // 初始化过程中的短暂空状态不应报警
    if (engine.getSnapshot() > 0) {
      console.warn(`[NexusField] Field not found: ${dataPath}`);
    }
    return null;
  }

  // 祖先对象容器隐藏 → 子树整体不可见（与字段自身 visible 合并判断）
  if (inherit.visible === false || !state.visible) {
    // 如果父布局节点配置了 removeHidden，则不渲染占位符（移除以防止栅格塌陷）
    if (layoutConfig.removeHidden === true) {
      return null;
    }
    // 默认行为：渲染 display:none 占位符以保持布局
    return <div className='hidden' data-nexus-hidden={dataPath} />;
  }

  // 从 enum + enumNames 构建选项（x-render 对齐）
  const options = state.meta.enum
    ? state.meta.enum.map((value: any, index: number) => ({
        value,
        label: state.meta.enumNames?.[index] ?? String(value),
      }))
    : (state.props.options as
        | Array<{ label: string; value: unknown } | string | number>
        | undefined);

  // 表单级 readOnly 与对象容器继承 readOnly 与字段级 readOnly 合并（父级激活时优先）
  const readOnly =
    config.readOnly || inherit.readOnly === true || state.readOnly;
  // 对象容器继承 disabled（父级激活时优先），与字段级 disabled 合并
  const disabled = inherit.disabled === true || state.disabled;

  // readOnlyWidget：指定 readOnly 生效时切换使用的渲染 widget（x-render readOnlyWidget 对齐）。
  // - 配置了 readOnlyWidget 且字段为只读时，切换渲染该 widget（readOnly 一并透传，
  //   widget 按自身逻辑决定只读展示形态，如 treeSelect 的 readOnly 回显）；
  // - 未配置时 readOnly 原样透传给 widget，由 widget 自身决定只读形态
  //   （antd 原生 readOnly，或内置 widget 的 ReadOnlyDisplay 文本回退）。
  const wantReadOnlyWidget = readOnly && !!state.meta.readOnlyWidget;
  const widgetName = wantReadOnlyWidget
    ? state.meta.readOnlyWidget!
    : state.meta.widget;
  /** 获取UI组件库 进行渲染 **/
  let Widget = engine.getWidget(widgetName);
  // readOnlyWidget 未注册时优雅降级：退回原 widget，沿用现有只读渲染方式
  if (!Widget && wantReadOnlyWidget) {
    Widget = engine.getWidget(state.meta.widget);
  }

  if (!Widget) {
    return (
      <div className='text-xs text-red-500' data-nexus-field={dataPath}>
        ⚠️ Widget "{state.meta.widget}" 未注册 (path: {dataPath})
      </div>
    );
  }

  // 字段级配置优先于表单级配置
  const fieldDisplayType = state.meta.displayType ?? config.displayType;
  const fieldLabelWidth = state.meta.labelWidth ?? config.labelWidth;
  const fieldColumn = state.meta.column ?? config.column;

  // 布局属性作用于 NexusField 包装层而非 DOM 控件
  // - column（fieldColumn）：字段内部子元素分列数（如 checkboxes/radio），传给 Widget
  // - colSpan：在父 Grid 中横跨多少列（tailwind 风格：gridColumn: span N）
  // - width：在父 Flex 布局中自身宽度（百分比或固定值），flexShrink:0 防压缩
  const effectiveColSpan = resolveColSpan(state.meta.colSpan, gridCtx);
  const wrapperStyle: CSSProperties = {
    ...(state.meta.width ? { width: state.meta.width, flexShrink: 0 } : {}),
    ...(effectiveColSpan ? { gridColumn: `span ${effectiveColSpan}` } : {}),
  };

  // 从 reactions 依赖构建 dependValues，供 widget 获取关联字段值
  const dependValues: Record<string, unknown> = {};
  if (state.reactions) {
    for (const reaction of state.reactions) {
      if (reaction.dependencies) {
        for (const dep of reaction.dependencies) {
          dependValues[dep] = engine.getFieldValue(dep);
        }
      }
    }
  }

  return (
    <div
      data-nexus-field={dataPath}
      onBlur={handleBlur}
      style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
    >
      <Widget
        key={layoutKey}
        dataPath={dataPath}
        path={dataPath}
        value={state.value}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        loading={state.loading}
        required={state.required}
        title={state.meta.title}
        description={state.meta.description}
        placeholder={state.meta.placeholder}
        label={state.meta.label}
        options={options}
        errors={state.errors}
        extra={state.meta.extra}
        displayType={fieldDisplayType}
        labelWidth={fieldLabelWidth}
        column={fieldColumn}
        form={form}
        dependValues={dependValues}
        items={state.meta.items}
        {...state.props}
      />
    </div>
  );
}
