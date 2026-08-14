import { ColorPicker } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const colorWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    title,
    description,
    errors,
    extra,
    width,
    readOnly,
    required,
    placeholder: _ph,
    options: _opt,
    displayType,
    labelWidth,
    column: _col,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      const colorValue = value as string | undefined;
      return (
        <div className='flex items-center gap-2 h-8'>
          <span
            className='inline-block h-5 w-5 shrink-0 rounded border border-black/10'
            style={{ backgroundColor: colorValue || 'transparent' }}
          />
          <span className='text-[13px] text-black/85'>{colorValue || '-'}</span>
        </div>
      );
    }
    return (
      <ColorPicker
        value={value as string}
        onChange={(color) => onChange(color.toHexString())}
        disabled={disabled || loading}
        showText
        {...rest}
      />
    );
  },
);
