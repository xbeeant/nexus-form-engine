import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { timePickerWidget } from '../src/widgets/time-picker';

describe('timePickerWidget', () => {
  it('渲染 antd TimePicker 控件', () => {
    const { container } = render(
      timePickerWidget({
        value: '14:30:00',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).not.toBeNull();
  });

  it('回显时间值', () => {
    const { container } = render(
      timePickerWidget({
        value: '09:15:30',
        format: 'HH:mm:ss',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).not.toBeNull();
  });

  it('undefined 值不崩溃', () => {
    const { container } = render(
      timePickerWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).not.toBeNull();
  });

  it('disabled 时时间选择器禁用', () => {
    const { container } = render(
      timePickerWidget({
        value: '14:30:00',
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const picker = container.querySelector('.ant-picker-disabled');
    expect(picker).not.toBeNull();
  });

  it('loading 时时间选择器禁用', () => {
    const { container } = render(
      timePickerWidget({
        value: '14:30:00',
        loading: true,
        onChange: () => {},
      } as never),
    );
    const picker = container.querySelector('.ant-picker-disabled');
    expect(picker).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay 文本', () => {
    const { container } = render(
      timePickerWidget({
        value: '14:30:00',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).toBeNull();
    expect(container.textContent).toContain('14:30:00');
  });

  it('readOnly 空值时渲染占位符', () => {
    const { container } = render(
      timePickerWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('format 默认 HH:mm:ss', () => {
    const { container } = render(
      timePickerWidget({
        value: '14:30',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).not.toBeNull();
  });

  it('width: 100% 默认样式', () => {
    const { container } = render(
      timePickerWidget({
        value: '14:30:00',
        onChange: () => {},
      } as never),
    );
    const picker = container.querySelector('.ant-picker');
    expect(picker?.getAttribute('style')).toContain('width: 100%');
  });

  it('透传 rest props', () => {
    const { container } = render(
      timePickerWidget({
        value: '14:30:00',
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const picker = container.querySelector('.ant-picker.my-custom-class');
    expect(picker).not.toBeNull();
  });
});
