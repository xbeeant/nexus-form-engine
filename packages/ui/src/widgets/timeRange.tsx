import { TimePicker } from 'antd';
import dayjs from 'dayjs';
import { type WidgetProps, withFormItem } from './_shared';

export const timeRangeWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    format,
    placeholder,
    form,
    ...rest
  }: WidgetProps) => {
    const values = Array.isArray(value) ? (value as string[]) : [];
    return (
      <TimePicker.RangePicker
        value={
          values.map((v) => (v ? dayjs(v) : null)) as [
            dayjs.Dayjs | null,
            dayjs.Dayjs | null,
          ]
        }
        onChange={(_, timeStrings) => onChange(timeStrings)}
        disabled={disabled || loading}
        style={{ width: '100%' }}
        format={(format as string) ?? 'HH:mm:ss'}
        placeholder={
          (Array.isArray(placeholder) ? placeholder : undefined) as unknown as
            | [string, string]
            | undefined
        }
        {...rest}
      />
    );
  },
);
