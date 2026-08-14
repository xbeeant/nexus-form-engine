import { Select } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export const multiSelectWidget = withFormItem(
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
    tokenSeparators,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
    }
    // 声明式拆分：设计器以逗号分隔字符串配置 tokenSeparators，转为数组
    const separators =
      typeof tokenSeparators === 'string' && tokenSeparators.trim()
        ? tokenSeparators
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    return (
      <Select
        value={(value as unknown[]) ?? []}
        onChange={(v) => onChange(v)}
        mode='multiple'
        placeholder={placeholder ?? '请选择...'}
        disabled={disabled || loading}
        options={mapOptions(options)}
        allowClear
        tokenSeparators={separators}
        {...rest}
      />
    );
  },
);
