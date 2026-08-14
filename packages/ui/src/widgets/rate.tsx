import { Rate } from 'antd';
import { ReadOnlyDisplay, type WidgetProps, withFormItem } from './_shared';

export const rateWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    readOnly,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      const starCount = Math.round(Number(value) || 0);
      if (starCount <= 0) {
        return <ReadOnlyDisplay value={value} />;
      }
      return (
        <span style={{ fontSize: 16, color: '#fadb14', letterSpacing: 2 }}>
          {'★'.repeat(starCount)}
        </span>
      );
    }
    return (
      <Rate
        value={value as number}
        onChange={(v) => onChange(v)}
        disabled={disabled || loading}
        {...rest}
      />
    );
  },
);
