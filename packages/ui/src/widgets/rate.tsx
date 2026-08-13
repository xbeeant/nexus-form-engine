import { Rate } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const rateWidget = withFormItem(
  ({ value, onChange, disabled, loading, form, dependValues: _dv, dataPath: _dp, path: _p, ...rest }: WidgetProps) => {
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
