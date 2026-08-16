import { toBoolean } from '@xbeeant/form-engine/utils/schema-helper';
import { Input } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const urlInputWidget = withFormItem(
  ({
    value,
    onChange,
    placeholder,
    disabled,
    loading,
    title,
    description,
    errors,
    extra,
    width,
    readOnly,
    required,
    options: _opt,
    displayType,
    labelWidth,
    column: _col,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => {
    return (
      <Input
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'https://'}
        readOnly={toBoolean(readOnly)}
        disabled={disabled || loading}
        prefix={<span style={{ color: '#999' }}>🔗</span>}
        {...rest}
      />
    );
  },
);
