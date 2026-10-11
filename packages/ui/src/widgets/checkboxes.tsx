import { Checkbox } from 'antd';
import { EnumDisplay, mapOptions, type WidgetProps } from './_shared';

export const checkboxesWidget = ({
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
  remoteVersion: _rv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <EnumDisplay value={value} options={options} />;
  }
  return (
    <Checkbox.Group
      value={(value as unknown[]) ?? []}
      onChange={(v) => onChange(v)}
      disabled={disabled || loading}
      options={mapOptions(options)}
      {...rest}
    />
  );
};
