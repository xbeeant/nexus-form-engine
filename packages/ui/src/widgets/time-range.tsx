import { TimePicker, type TimePickerProps } from 'antd';
import type { Dayjs } from 'dayjs';
import { ReadOnlyDisplay, toDayjs, type WidgetProps } from './_shared';

type PickerDisabledTime = NonNullable<TimePickerProps['disabledTime']>;
type PickerDisabledTimes = ReturnType<PickerDisabledTime>;

const range = (start: number, end: number): number[] => {
  const result: number[] = [];
  for (let i = start; i <= end; i += 1) {
    result.push(i);
  }
  return result;
};

/** 汇总 disabledHours / disabledMinutes / disabledSeconds 的禁用值（并集去重） */
function unionDisabled<T extends (...args: number[]) => number[]>(
  base: T | undefined,
  theirs: T | undefined,
  ...args: Parameters<T>
): number[] {
  const collect = (fn?: T): number[] =>
    fn ? Array.from(new Set(fn(...args))) : [];
  return [...collect(base), ...collect(theirs)];
}

/** 合并内部区间约束与用户自定义 disabledTime，返回并集 */
function mergeDisabledTimes(
  base: Partial<PickerDisabledTimes>,
  theirs?: PickerDisabledTimes,
): PickerDisabledTimes {
  return {
    disabledHours: () =>
      unionDisabled(base.disabledHours, theirs?.disabledHours),
    disabledMinutes: (hour) =>
      unionDisabled(base.disabledMinutes, theirs?.disabledMinutes, hour),
    disabledSeconds: (hour, minute) =>
      unionDisabled(
        base.disabledSeconds,
        theirs?.disabledSeconds,
        hour,
        minute,
      ),
  };
}

export const timeRangeWidget = ({
  value,
  onChange,
  disabled,
  loading: _ld,
  readOnly,
  format,
  placeholder,
  disabledTime,
  form: _form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps & { disabledTime?: PickerDisabledTime }) => {
  const formatStr = typeof format === 'string' ? format : 'HH:mm:ss';
  const [startTime, endTime] =
    Array.isArray(value) && value.length === 2 ? value : [null, null];

  const handleStartChange = (_: Dayjs | null, timeString: string | null) => {
    onChange?.([timeString ?? '', endTime]);
  };

  const handleEndChange = (_: Dayjs | null, timeString: string | null) => {
    onChange?.([startTime, timeString ?? '']);
  };

  // 起始时间禁用 endTime 之后的时分秒（TimePicker 通过 disabledTime 生效）
  const baseDisabledStart = (): Partial<PickerDisabledTimes> => {
    if (!endTime) {
      return {};
    }
    const end = toDayjs(endTime, formatStr);
    if (!end) {
      return {};
    }
    const endHour = end.hour();
    const endMinute = end.minute();
    const endSecond = end.second();
    return {
      disabledHours: () => range(endHour + 1, 23),
      disabledMinutes: (hour) =>
        hour === endHour ? range(endMinute + 1, 59) : [],
      disabledSeconds: (hour, minute) =>
        hour === endHour && minute === endMinute
          ? range(endSecond + 1, 59)
          : [],
    };
  };

  // 结束时间禁用 startTime 之前的时分秒
  const baseDisabledEnd = (): Partial<PickerDisabledTimes> => {
    if (!startTime) {
      return {};
    }
    const start = toDayjs(startTime, formatStr);
    if (!start) {
      return {};
    }
    const startHour = start.hour();
    const startMinute = start.minute();
    const startSecond = start.second();
    return {
      disabledHours: () => range(0, startHour - 1),
      disabledMinutes: (hour) =>
        hour === startHour ? range(0, startMinute - 1) : [],
      disabledSeconds: (hour, minute) =>
        hour === startHour && minute === startMinute
          ? range(0, startSecond - 1)
          : [],
    };
  };

  const _placeholder = (Array.isArray(placeholder)
    ? placeholder
    : ['', '']) as unknown as [string, string] | undefined;

  if (readOnly) {
    // antd 6 TimePicker 已不支持 readOnly，统一回退文本展示
    const range =
      Array.isArray(value) && value.length === 2
        ? (value as unknown[]).filter((v) => v !== '' && v != null).join(' ~ ')
        : value;
    return <ReadOnlyDisplay value={range} />;
  }

  return (
    <div
      className={`
        flex w-full items-center h-8 px-2.75 py-1 
        transition-all duration-300
        ${disabled ? 'bg-[#f5f5f5] cursor-not-allowed' : ''}
      `}
    >
      <TimePicker
        className='flex-1 min-w-0 border-none shadow-none bg-transparent [&_input]:p-0 [&_input]:text-center'
        defaultValue={toDayjs(startTime, formatStr)}
        onChange={handleStartChange}
        disabledTime={(date) =>
          mergeDisabledTimes(baseDisabledStart(), disabledTime?.(date))
        }
        format={formatStr}
        placeholder={_placeholder?.[0] ?? ''}
        disabled={disabled}
        readOnly={readOnly}
        {...rest}
      />
      <span className='mx-2 text-black/25 shrink-0'>~</span>
      <TimePicker
        className='flex-1 min-w-0 border-none shadow-none bg-transparent [&_input]:p-0 [&_input]:text-center'
        defaultValue={toDayjs(endTime, formatStr)}
        onChange={handleEndChange}
        disabledTime={(date) =>
          mergeDisabledTimes(baseDisabledEnd(), disabledTime?.(date))
        }
        format={formatStr}
        placeholder={_placeholder?.[1] ?? ''}
        disabled={disabled}
        readOnly={readOnly}
        {...rest}
      />
    </div>
  );
};
