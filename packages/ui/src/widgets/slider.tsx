import { Slider } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const sliderWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    min,
    max,
    step,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => (
    <Slider
      value={(value as number) ?? 0}
      onChange={(v) => onChange(v as number)}
      disabled={disabled || loading}
      min={(min as number) ?? 0}
      max={(max as number) ?? 100}
      step={(step as number) ?? 1}
      {...rest}
    />
  ),
);
