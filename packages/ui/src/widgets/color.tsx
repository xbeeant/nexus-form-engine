import { ColorPicker } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const colorWidget = withFormItem(
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
      <ColorPicker
        value={value as string}
        onChange={(color) => onChange(color.toHexString())}
        disabled={disabled || loading}
        showText
        {...rest}
      />
    );
  },
);
