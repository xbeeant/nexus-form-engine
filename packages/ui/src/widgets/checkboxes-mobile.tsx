import { Checkbox } from 'antd-mobile';
import { EnumDisplay, mapOptions, type WidgetProps } from './_shared';

const CheckboxGroup = Checkbox.Group;

export const checkboxesMobileWidget = ({
  value,
  onChange,
  options,
  disabled,
  loading,
  readOnly,
  required: _required,
  title: _title,
  description: _desc,
  errors: _errors,
  label: _label,
  extra: _extra,
  width: _width,
  displayType: _displayType,
  labelWidth: _labelWidth,
  column: _column,
  items: _items,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  remoteVersion: _rv,
  props: _props,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <EnumDisplay value={value} options={options} />;
  }

  const mapped = mapOptions(options);

  return (
    <CheckboxGroup
      value={Array.isArray(value) ? value : []}
      onChange={(v) => onChange(v)}
      disabled={disabled || loading}
      {...rest}
    >
      {mapped.map((o) => (
        <Checkbox key={String(o.value)} value={o.value ?? ''}>
          {o.label}
        </Checkbox>
      ))}
    </CheckboxGroup>
  );
};
