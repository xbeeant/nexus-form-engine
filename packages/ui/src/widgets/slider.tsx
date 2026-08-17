import { Slider } from 'antd';
import { ReadOnlyDisplay, type WidgetProps } from './_shared';

export const sliderWidget = ({
  value,
  onChange,
  disabled,
  loading,
  readOnly,
  min,
  max,
  step,
  tooltip,
  marks,
  form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <ReadOnlyDisplay value={value} />;
  }
  // 声明式拆分：tooltip 布尔值 → antd tooltip.open；marks 为 JSON 字符串时解析为对象
  const tooltipProp =
    typeof tooltip === 'boolean' ? { open: tooltip } : undefined;
  let marksProp: Record<number, string> | undefined;
  if (typeof marks === 'string' && marks.trim()) {
    try {
      marksProp = JSON.parse(marks) as Record<number, string>;
    } catch {
      marksProp = undefined;
    }
  } else if (marks && typeof marks === 'object') {
    marksProp = marks as Record<number, string>;
  }
  return (
    <Slider
      value={(value as number) ?? 0}
      onChange={(v) => onChange(v as number)}
      disabled={disabled || loading}
      min={(min as number) ?? 0}
      max={(max as number) ?? 100}
      step={(step as number) ?? 1}
      tooltip={tooltipProp}
      marks={marksProp}
      {...rest}
    />
  );
};
