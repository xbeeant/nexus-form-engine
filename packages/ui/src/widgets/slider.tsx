import { Slider } from 'antd';
import { ReadOnlyDisplay, type WidgetProps, withFormItem } from './_shared';

export const sliderWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    readOnly,
    min,
    max,
    step,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} />;
    }
    return (
      <Slider
        value={(value as number) ?? 0}
        onChange={(v) => onChange(v as number)}
        disabled={disabled || loading}
        min={(min as number) ?? 0}
        max={(max as number) ?? 100}
        step={(step as number) ?? 1}
        {...rest}
      />
    );
  },
);
