# 自定义 Widget 指南

本文档介绍如何创建自定义的表单 widget，遵循项目的 widget 扩展规范。

## 目录

- [Widget 基本结构](#widget-基本结构)
- [必需的导入](#必需的导入)
- [Props 类型定义](#props-类型定义)
- [实现步骤](#实现步骤)
- [完整示例](#完整示例)
- [常见使用场景](#常见使用场景)
- [最佳实践](#最佳实践)

---

## Widget 基本结构

自定义 widget 必须使用 `withFormItem` 高阶函数包裹，以统一处理表单项的布局、验证、只读模式等。

```typescript
import { withFormItem } from './_shared';

export const myWidget = withFormItem((props: WidgetProps) => {
  // 返回 React 节点
  return <div>{/* 组件实现 */}</div>;
});
```

---

## 必需的导入

```typescript
import {
  withFormItem,        // 核心：表单包裹函数
  mapOptions,          // 工具：标准化 options 格式
  ReadOnlyDisplay,     // 工具：只读显示组件
  type WidgetProps     // 类型：widget 属性类型
} from './_shared';
```

### WidgetProps 属性说明

| 属性 | 类型 | 说明 |
|------|------|------|
| `value` | `unknown` | 当前值（必传） |
| `onChange` | `(value) => void` | 值变更回调（必传） |
| `disabled` | `boolean` | 是否禁用 |
| `loading` | `boolean` | 是否加载中 |
| `readOnly` | `boolean` | 是否只读 |
| `hidden` | `boolean` | 是否隐藏 |
| `placeholder` | `string` | 占位符 |
| `options` | `Array<{label: string, value: unknown} \| string \| number>` | 标准化选项列表 |
| `title` | `string` | 字段标签 |
| `description` | `string` | 字段描述 |
| `errors` | `string[]` | 错误信息 |
| `required` | `boolean` | 是否必填 |
| `extra` | `string` | 额外说明信息 |
| `width` | `string` | 单元素展示宽度 |
| `displayType` | `'row' \| 'column' \| 'inline'` | 字段级布局方向 |
| `labelWidth` | `number \| string` | 字段级 label 宽度 |
| `column` | `number` | 字段级列数 |
| `form` | `NexusFormInstance` | 表单实例 |
| `dependValues` | `Record<string, unknown>` | 依赖字段的值映射 |
| `items` | `DataFieldSchema \| DataObjectSchema` | 数组节点的 items 定义 |

---

## Props 类型定义

### 基础 Widget 类型

```typescript
import { type WidgetProps } from './_shared';

type MyWidgetProps = WidgetProps & {
  // 自定义属性
  customProp?: string;
  [key: string]: any;
};

export const myWidget = withFormItem(({ value, onChange, ...props }: MyWidgetProps) => {
  return <div>...</div>;
});
```

### 带 options 的 Widget 类型

```typescript
import { type WidgetProps } from './_shared';

type SelectWidgetProps = WidgetProps & {
  options?: Array<{ label: string; value: unknown } | string | number>;
  customProp?: string;
  [key: string]: any;
};

export const myWidget = withFormItem(({
  value,
  onChange,
  options,
  customProp,
  ...props
}: SelectWidgetProps) => {
  // 使用 mapOptions 标准化 options
  const normalizedOptions = options || mapOptions(options);

  return <Select options={normalizedOptions} value={value} onChange={onChange} />;
});
```

### 带 optionsList 的 Widget 类型

```typescript
import { type WidgetProps } from './_shared';

type CascaderWidgetProps = WidgetProps & {
  optionsList?: DefaultOptionType[];
  nullOption?: Partial<DefaultOptionType>;
  props?: CascaderProps;
  [key: string]: any;
};

export const myWidget = withFormItem(({
  value,
  optionsList,
  nullOption,
  fieldProps,
  ...props
}: CascaderWidgetProps) => {
  // 注入 nullOption
  const finalOptions = nullOption
    ? [nullOption, ...(optionsList || [])]
    : optionsList;

  return <Cascader options={finalOptions} value={value} {...fieldProps} />;
});
```

---

## 实现步骤

### 步骤 1：创建 widget 文件

在 `packages/ui/src/widgets/` 目录下创建新的 widget 文件：

```bash
# 例如：myWidget.tsx
```

### 步骤 2：实现基本结构

```typescript
import { withFormItem } from './_shared';

export const myWidget = withFormItem(({ value, onChange, ...props }) => {
  return <div>组件实现</div>;
});
```

### 步骤 3：提取和传递标准属性

```typescript
export const myWidget = withFormItem(({
  value,
  onChange,
  disabled,
  loading,
  form,
  placeholder,
  options,
  ...restProps
}: MyWidgetProps) => {
  // 传递给底层组件
  return (
    <MyComponent
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      placeholder={placeholder}
      options={options}
      {...restProps}
    />
  );
});
```

### 步骤 4：导出到 widgets/index.ts

```typescript
// packages/ui/src/widgets/index.ts
import { myWidget } from './myWidget';

export { myWidget };
```

### 步骤 5：添加到 antdWidgets 映射

```typescript
// packages/ui/src/widgets/index.ts
export const antdWidgets = {
  // ... 其他 widget
  myWidget: myWidget,
};
```

---

## 完整示例

### 示例 1：简单文本输入 Widget

```typescript
// packages/ui/src/widgets/textWidget.tsx
import { Input } from 'antd';
import { withFormItem, type WidgetProps } from './_shared';

type TextWidgetProps = WidgetProps & {
  maxLength?: number;
  [key: string]: any;
};

export const textWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    placeholder,
    maxLength,
    ...restProps
  }: TextWidgetProps) => {
    return (
      <Input
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        placeholder={placeholder}
        maxLength={maxLength}
        {...restProps}
      />
    );
  },
);
```

### 示例 2：带选项的 Select Widget

```typescript
// packages/ui/src/widgets/dynamicSelect.tsx
import { Select } from 'antd';
import { mapOptions, type WidgetProps, withFormItem } from './_shared';

type DynamicSelectProps = WidgetProps & {
  optionsList?: Array<{ label: string; value: unknown }>;
  filterOption?: boolean;
  [key: string]: any;
};

export const dynamicSelect = withFormItem(
  ({
    value,
    onChange,
    optionsList,
    filterOption = true,
    disabled,
    loading,
    placeholder = '请选择',
    ...restProps
  }: DynamicSelectProps) => {
    const normalizedOptions = optionsList || mapOptions(restProps.options);

    return (
      <Select
        value={value}
        onChange={onChange}
        options={normalizedOptions}
        disabled={disabled || loading}
        placeholder={placeholder}
        showSearch
        filterOption={filterOption}
        {...restProps}
      />
    );
  },
);
```

### 示例 3：级联选择 Widget

```typescript
// packages/ui/src/widgets/cascaderWidget.tsx
import { Cascader } from 'antd';
import type { CascaderProps, DefaultOptionType } from 'antd/es/select';
import { mapOptions, type WidgetProps, withFormItem } from './_shared';

type CascaderWidgetProps = WidgetProps & {
  optionsList?: DefaultOptionType[];
  nullOption?: Partial<DefaultOptionType>;
  fieldProps?: CascaderProps;
  [key: string]: any;
};

export const cascaderWidget = withFormItem(
  ({
    value,
    optionsList,
    nullOption,
    props,
    disabled,
    loading,
    placeholder = '请选择',
    ...restProps
  }: CascaderWidgetProps) => {
    // 标准化 options
    const normalizedOptions = optionsList || mapOptions(props?.options);

    // 注入 nullOption 到第一级
    const finalOptions = nullOption
      ? [nullOption, ...normalizedOptions]
      : normalizedOptions;

    return (
      <Cascader
        value={value}
        onChange={(val) => onChange(val)}
        options={finalOptions}
        disabled={disabled || loading}
        placeholder={placeholder}
        {...restProps}
        props={{ ...props, options: finalOptions }}
      />
    );
  },
);
```

---

## 常见使用场景

### 场景 1：只读模式显示

使用 `ReadOnlyDisplay` 组件在只读模式下展示值：

```typescript
import { ReadOnlyDisplay } from './_shared';

export const myWidget = withFormItem(({ value, options, ...props }: WidgetProps) => {
  return (
    <>
      <ReadOnlyDisplay value={value} options={options} />
    </>
  );
});
```

### 场景 2：禁用加载状态

```typescript
export const myWidget = withFormItem(({ disabled, loading, ...props }: WidgetProps) => {
  return (
    <MyComponent
      disabled={disabled || loading}
      loading={loading}
      {...props}
    />
  );
});
```

### 场景 3：使用表单实例

```typescript
import { type NexusFormInstance } from '@xbeeant/form-engine';

export const myWidget = withFormItem(({ form, value, onChange, ...props }: WidgetProps) => {
  // 获取表单其他字段的值
  const otherValue = form?.getValuesByPath?.('fieldName');

  return (
    <MyComponent
      otherValue={otherValue}
      value={value}
      onChange={(val) => onChange(val)}
      {...props}
    />
  );
});
```

### 场景 4：依赖字段

```typescript
export const dependentWidget = withFormItem(
  ({ dependValues, value, onChange, disabled, loading, path: _p, dataPath: _dp, ...props }: WidgetProps & { dependValues?: Record<string, unknown> }) => {
    const parentValue = dependValues?.parentField;

    // 根据 parentValue 的值决定是否显示或修改 behavior
    const isEnabled = parentValue === 'someValue';

    return (
      <MyComponent
        value={value}
        onChange={onChange}
        disabled={disabled || loading || !isEnabled}
        {...props}
      />
    );
  },
);
```

---

## 最佳实践

### 1. 使用 withFormItem 包裹

**✅ 推荐：**
```typescript
export const myWidget = withFormItem(({ value, onChange, ...props }) => {
  return <MyComponent {...props} />;
});
```

**❌ 不推荐：**
```typescript
export const myWidget = ({ value, onChange, ...props }: WidgetProps) => {
  return <MyComponent {...props} />;
};
```

### 2. 正确处理 disabled 和 loading

```typescript
export const myWidget = withFormItem(({ disabled, loading, ...props }) => {
  return (
    <MyComponent
      disabled={disabled || loading}  // 合并禁用状态
      loading={loading}
      {...props}
    />
  );
});
```

### 3. 使用 mapOptions 标准化 options

```typescript
import { mapOptions } from './_shared';

export const myWidget = withFormItem(({ options, ...props }) => {
  const normalizedOptions = options || mapOptions(props.options);
  return <MyComponent options={normalizedOptions} {...props} />;
});
```

### 4. 提供合理的默认值

```typescript
export const myWidget = withFormItem(({ placeholder = '请选择', ...props }) => {
  return <MyComponent placeholder={placeholder} {...props} />;
});
```

### 5. 透传剩余属性

```typescript
export const myWidget = withFormItem(({ value, onChange, ...restProps }) => {
  return <MyComponent value={value} onChange={onChange} {...restProps} />;
});
```

### 6. 类型定义清晰

```typescript
type MyWidgetProps = WidgetProps & {
  customProp?: string;
  [key: string]: any;
};

export const myWidget = withFormItem((props: MyWidgetProps) => {
  // ...
});
```

### 7. 添加 JSDoc 注释

```typescript
/**
 * 自定义级联选择组件
 *
 * 特性：
 * - 支持多级选项选择
 * - 自动标准化 options 格式
 * - 支持空值根节点注入
 * - 支持只读模式和隐藏模式
 *
 * @param props - Widget 属性
 * @returns React 节点
 */
export const myWidget = withFormItem((props: MyWidgetProps) => {
  // ...
});
```

---

## 常见问题

### Q1: 为什么需要 withFormItem？

A: `withFormItem` 统一处理表单项的布局、验证、只读模式等，确保所有 widget 的行为一致。

### Q2: 如何处理只读模式？

A: `withFormItem` 会自动处理只读模式，渲染 `ReadOnlyDisplay` 组件。

### Q3: options 的格式是什么？

A: 可以是：
- `Array<{ label: string; value: unknown }>` - 对象数组
- `Array<string | number>` - 纯字符串或数字数组
- `undefined` - 无选项

使用 `mapOptions` 函数统一转换。

### Q4: 如何使用表单实例？

A: 通过 `form` 属性访问表单实例：
```typescript
const value = form?.getValuesByPath?.('path.to.field');
form?.setValueByPath('path.to.field', newValue);
```

### Q5: 如何处理隐藏属性？

A: `withFormItem` 会自动处理 `hidden` 属性，隐藏时不会渲染任何内容。

---

## 更多资源

- [Ant Design 组件库](https://ant.design/components)
- [@ant-design/pro-components](https://procomponents.ant.design)
- [项目代码](../src/widgets/)
