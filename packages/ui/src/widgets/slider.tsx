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
  remoteVersion: _rv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <ReadOnlyDisplay value={value} />;
  }
  // 声明式拆分：tooltip 布尔值 → antd tooltip.open；marks 为 JSON 字符串时解析为对象。
  // antd Slider 默认即悬停/拖动时显示数值提示，无需强制 open（open: true 会常显）；
  // 因此仅当明确禁用（false）或显式对象配置（{ open }）时才传 tooltip，true/undefined 走默认悬停显示。
  let tooltipProp: { open?: boolean } | undefined;
  const sliderTooltip = tooltip as boolean | { open?: boolean } | undefined;
  if (sliderTooltip === false) {
    tooltipProp = { open: false };
  } else if (typeof sliderTooltip === 'object' && sliderTooltip !== null) {
    tooltipProp = sliderTooltip;
  }

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
