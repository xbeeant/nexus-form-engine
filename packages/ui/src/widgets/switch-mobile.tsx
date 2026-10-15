import { Switch } from 'antd-mobile';
import { EnumDisplay, type WidgetProps } from './_shared';

export const switchMobileWidget = ({
  value,
  onChange,
  disabled,
  loading,
  readOnly,
  options,
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

  const checked =
    value === true || value === 1 || value === 'true' || value === '1';

  return (
    <Switch
      checked={checked}
      onChange={(v) => onChange(v)}
      disabled={disabled || loading}
      {...rest}
    />
  );
};
