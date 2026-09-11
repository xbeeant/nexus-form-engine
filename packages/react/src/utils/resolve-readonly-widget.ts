export interface ResolveWidgetInput {
  baseWidget: string;
  readOnlyWidget?: string;
  schemaType?: string;
  schemaWidget?: unknown;
}

/**
 * readOnly 模式 widget 选择（NexusField 与数组项渲染共享）：
 * 1. readOnlyWidget 显式声明 → 使用 readOnlyWidget
 * 2. type:"string" 无显式 widget（推断为 input）→ 降级为 html 渲染
 * 3. 其余情况 → 保持原 widget，readOnly 透传由 widget 自身处理
 *
 * 调用方按 widgetName 查询 engine.getWidget，
 * 若 wantReadOnlyWidget 为 true 且未注册可回退 baseWidget。
 */
export function resolveReadOnlyWidget(
  { baseWidget, readOnlyWidget, schemaType, schemaWidget }: ResolveWidgetInput,
  readOnly: boolean,
): { widgetName: string; wantReadOnlyWidget: boolean } {
  const inferredInput =
    baseWidget === 'input' && schemaType === 'string' && !schemaWidget;
  const wantReadOnlyWidget = readOnly && (!!readOnlyWidget || inferredInput);
  return {
    widgetName: wantReadOnlyWidget ? (readOnlyWidget ?? 'html') : baseWidget,
    wantReadOnlyWidget,
  };
}
