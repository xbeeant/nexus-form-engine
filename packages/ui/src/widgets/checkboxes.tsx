import { Checkbox } from 'antd';
import { mapOptions, type WidgetProps, withFormItem } from './_shared';

export const checkboxesWidget = withFormItem(
  ({
    value,
    onChange,
    options,
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
      <Checkbox.Group
        value={(value as unknown[]) ?? []}
        onChange={(v) => onChange(v)}
        disabled={disabled || loading}
        options={mapOptions(options)}
        {...rest}
      />
    );
  },
);
