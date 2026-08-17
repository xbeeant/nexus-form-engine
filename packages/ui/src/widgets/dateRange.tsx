import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import { toDayjs, type WidgetProps } from './_shared';

export const dateRangeWidget = ({
  value,
  onChange,
  disabled,
  loading: _ld,
  readOnly,
  format,
  placeholder,
  form: _form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps) => {
  console.log(format, rest);
  const formatStr = typeof format === 'string' ? format : undefined;
  const [startDate, endDate] =
    Array.isArray(value) && value.length === 2
      ? [toDayjs(value[0], formatStr), toDayjs(value[1], formatStr)]
      : [null, null];

  const handleStartChange = (date: Dayjs | null) => {
    onChange?.([date, endDate]);
  };

  const handleEndChange = (date: Dayjs | null) => {
    onChange?.([startDate, date]);
  };

  const disabledStartDate = (current: Dayjs) => {
    if (!endDate) {
      return false;
    }
    return current?.isAfter(endDate, 'day');
  };

  const disabledEndDate = (current: Dayjs) => {
    if (!startDate) {
      return false;
    }
    return current?.isBefore(startDate, 'day');
  };

  const _placeholder = (Array.isArray(placeholder)
    ? placeholder
    : ['', '']) as unknown as [string, string] | undefined;
  return (
    <div
      className={`
        flex w-full items-center h-8 px-[11px] py-1 
        transition-all duration-300
        ${disabled ? 'bg-[#f5f5f5] cursor-not-allowed' : ''}
      `}
    >
      <DatePicker
        className='flex-1 min-w-0 border-none shadow-none bg-transparent p-0 [&_input]:p-0 [&_input]:text-center'
        value={startDate}
        onChange={handleStartChange}
        disabledDate={disabledStartDate}
        format={formatStr}
        placeholder={_placeholder?.[0] ?? ''}
        disabled={disabled}
        readOnly={readOnly}
        {...rest}
      />
      <span className='mx-2 text-black/25 shrink-0'>~</span>
      <DatePicker
        className='flex-1 min-w-0 border-none shadow-none bg-transparent p-0 [&_input]:p-0 [&_input]:text-center'
        value={endDate}
        onChange={handleEndChange}
        disabledDate={disabledEndDate}
        format={formatStr}
        placeholder={_placeholder?.[1] ?? ''}
        disabled={disabled}
        readOnly={readOnly}
        {...rest}
      />
    </div>
  );
};
