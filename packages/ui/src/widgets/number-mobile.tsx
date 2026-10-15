import { Stepper } from 'antd-mobile';
import { SimpleDisplay, type WidgetProps } from './_shared';

export const numberMobileWidget = ({
  value,
  onChange,
  disabled,
  loading,
  readOnly,
  min,
  max,
  step,
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
    return <SimpleDisplay value={value} />;
  }

  return (
    <Stepper
      value={value as number}
      onChange={(v) => onChange(v)}
      disabled={disabled || loading}
      min={min as number}
      max={max as number}
      step={step as number}
      {...rest}
    />
  );
};
