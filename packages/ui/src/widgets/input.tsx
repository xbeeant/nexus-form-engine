import { toBoolean } from '@nexus/form-engine/utils/schema-helper.ts';
import { Input } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const inputWidget = withFormItem(
  ({
    value,
    onChange,
    placeholder,
    disabled,
    loading,
    form,
    dependValues,
    dataPath: _dp,
    path: _p,
    readOnly,
    required,
    ...rest
  }: WidgetProps) => {
    return (
      <Input
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={toBoolean(required)}
        disabled={toBoolean(disabled || loading)}
        {...rest}
      />
    );
  },
);
