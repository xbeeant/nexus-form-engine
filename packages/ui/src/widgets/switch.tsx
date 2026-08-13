import { Switch } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const switchWidget = withFormItem(
  ({ value, onChange, disabled, loading, form, dependValues: _dv, dataPath: _dp, path: _p, ...rest }: WidgetProps) => (
    <Switch
      checked={!!value}
      onChange={onChange}
      disabled={disabled || loading}
      {...rest}
    />
  ),
);
