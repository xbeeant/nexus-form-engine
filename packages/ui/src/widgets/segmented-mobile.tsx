import type { SegmentedValue } from 'antd-mobile';
import { Segmented } from 'antd-mobile';
import { EnumDisplay, mapOptions, type WidgetProps } from './_shared';

export const segmentedMobileWidget = ({
  value,
  onChange,
  options,
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
  form: _form,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <EnumDisplay value={value} options={options} />;
  }

  return (
    <Segmented
      value={value as string | number}
      onChange={(v: SegmentedValue) => onChange(v)}
      options={mapOptions(options).map((o) => ({
        label: o.label,
        value: o.value ?? '',
      }))}
      {...rest}
    />
  );
};
