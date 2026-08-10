import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { type WidgetProps, withFormItem } from './_shared';

export const dateRangeWidget = withFormItem(
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
      <DatePicker.RangePicker
        value={
          values.map((v) => (v ? dayjs(v) : null)) as [
            dayjs.Dayjs | null,
            dayjs.Dayjs | null,
          ]
        }
        onChange={(_, dateStrings) => onChange(dateStrings)}
        disabled={disabled || loading}
        style={{ width: '100%' }}
        format={format as string}
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
