import { toBoolean } from '@xbeeant/form-engine';
import { InputNumber } from 'antd';
import { ReadOnlyDisplay, type WidgetProps } from './_shared';

export const inputNumberWidget = ({
  value,
  onChange,
  disabled,
  loading,
  form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  readOnly,
  required,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <ReadOnlyDisplay value={value} />;
  }

  return (
    <InputNumber
      value={value as number | undefined}
      onChange={(v) => onChange(v ?? undefined)}
      disabled={toBoolean(disabled || loading)}
      required={toBoolean(required)}
      style={{ width: '100%' }}
      {...rest}
    />
  );
};