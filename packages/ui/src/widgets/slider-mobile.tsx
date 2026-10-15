import { Slider } from 'antd-mobile';
import { SimpleDisplay, type WidgetProps } from './_shared';

export const sliderMobileWidget = ({
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
    <Slider
      value={(value as number) ?? 0}
      onChange={(v) => onChange(v)}
      disabled={disabled || loading}
      min={(min as number) ?? 0}
      max={(max as number) ?? 100}
      step={(step as number) ?? 1}
      {...rest}
    />
  );
};
