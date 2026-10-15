import { Picker } from 'antd-mobile';
import type {
  PickerColumnItem,
  PickerValue,
} from 'antd-mobile/es/components/picker-view';
import { EnumDisplay, mapOptions, type WidgetProps } from './_shared';

export const pickerMobileWidget = ({
  value,
  onChange,
  options,
  placeholder,
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

  const columns: PickerColumnItem[][] = [
    mapped.map((o) => ({
      label: o.label,
      value: String(o.value),
    })),
  ];

  const selectedValue: PickerValue[] = Array.isArray(value)
    ? value.map((v) => (v ?? '') as PickerValue)
    : value !== undefined && value !== null
      ? [value as PickerValue]
      : [];

  return (
    <Picker
      value={selectedValue}
      onConfirm={(v) => {
        const restoreValue = (raw: string | number | null): unknown => {
          if (raw === 'undefined' || raw === 'null') {
            return raw;
          }
          const s = String(raw);
          const num = Number(s);
          return Number.isFinite(num) ? num : s;
        };
        const result = v.map(restoreValue);
        onChange(result.length === 1 ? result[0] : result);
      }}
      onCancel={() => {}}
      columns={columns}
      {...rest}
    />
  );
};
