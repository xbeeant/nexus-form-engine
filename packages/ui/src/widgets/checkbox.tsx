import { Checkbox } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const checkboxWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    title,
    description,
    errors,
    extra,
    width,
    readOnly,
    required,
    placeholder: _ph,
    options: _opt,
    displayType,
    labelWidth,
    column: _col,
    form,
    ...rest
  }: WidgetProps) => {
    return (
      <Checkbox
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled || loading}
        {...rest}
      >
        {title}
      </Checkbox>
    );
  },
);
