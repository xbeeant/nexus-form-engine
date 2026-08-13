import { TimePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import { toDayjs, type WidgetProps, withFormItem } from './_shared';

export const timeRangeWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading: _ld,
    format,
    placeholder,
  }: WidgetProps) => {
    const formatStr = typeof format === 'string' ? format : 'HH:mm:ss';
    const [startTime, endTime] =
      Array.isArray(value) && value.length === 2 ? value : [null, null];

    const handleStartChange = (_: Dayjs | null, timeString: string | null) => {
      onChange?.([timeString ?? '', endTime]);
    };

    const handleEndChange = (_: Dayjs | null, timeString: string | null) => {
      onChange?.([startTime, timeString ?? '']);
    };

    const disabledStartTime = (current: Dayjs) => {
      if (!endTime) {
        return false;
      }
      return current?.isAfter(endTime);
    };

    const disabledEndTime = (current: Dayjs) => {
      if (!startTime) {
        return false;
      }
      return current?.isBefore(startTime);
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
        <TimePicker
          className='flex-1 min-w-0 border-none shadow-none bg-transparent p-0 [&_input]:p-0 [&_input]:text-center'
          defaultValue={toDayjs(startTime, formatStr)}
          onChange={handleStartChange}
          disabledDate={disabledStartTime}
          format={formatStr}
          placeholder={_placeholder?.[0] ?? ''}
          disabled={disabled}
        />
        <span className='mx-2 text-black/25 shrink-0'>~</span>
        <TimePicker
          className='flex-1 min-w-0 border-none shadow-none bg-transparent p-0 [&_input]:p-0 [&_input]:text-center'
          defaultValue={toDayjs(endTime, formatStr)}
          onChange={handleEndChange}
          disabledDate={disabledEndTime}
          format={formatStr}
          placeholder={_placeholder?.[1] ?? ''}
          disabled={disabled}
        />
      </div>
    );
  },
);
