import { toBoolean } from '@nexus/form-engine/utils/schema-helper';
import { Input } from 'antd';
import { ReadOnlyDisplay, type WidgetProps, withFormItem } from './_shared';

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
    if (readOnly) {
      return <ReadOnlyDisplay value={value} />;
    }

    return (
      <Input
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={toBoolean(required)}
        readOnly={toBoolean(readOnly)}
        disabled={toBoolean(disabled || loading)}
        {...rest}
      />
    );
  },
);
