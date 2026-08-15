import { Mentions } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export const mentionsWidget = withFormItem(
  ({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    loading,
    readOnly,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    prefix,
    allowClear,
    autoSize,
    rows,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
    }

    // 提及候选：从 enum/options 生成 {value,label}（value 为触发词）
    const items = mapOptions(options).map((o) => ({
      value: String(o.label),
      label: String(o.label),
    }));

    return (
      <Mentions
        value={(value as string) ?? ''}
        onChange={(text) => onChange(text)}
        options={items}
        placeholder={placeholder ?? '请输入，@ 触发提及'}
        disabled={disabled || loading}
        prefix={prefix === undefined ? '@' : String(prefix)}
        allowClear={allowClear as boolean}
        autoSize={autoSize as boolean | { minRows?: number; maxRows?: number }}
        rows={rows as number}
        {...rest}
      />
    );
  },
);
