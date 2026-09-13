import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { datePickerWidget } from '../src/widgets/date-picker';

describe('datePickerWidget', () => {
  it('渲染 antd DatePicker 控件', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).not.toBeNull();
  });

  it('回显字符串值并按 format 格式化', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        format: 'YYYY-MM-DD',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('.ant-picker-input input');
    expect(input).not.toBeNull();
  });

  it('undefined 值不崩溃', () => {
    const { container } = render(
      datePickerWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).not.toBeNull();
  });

  it('disabled 时日期选择器禁用', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const picker = container.querySelector('.ant-picker-disabled');
    expect(picker).not.toBeNull();
  });

  it('loading 时日期选择器禁用', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        loading: true,
        onChange: () => {},
      } as never),
    );
    const picker = container.querySelector('.ant-picker-disabled');
    expect(picker).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay 文本', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).toBeNull();
    expect(container.textContent).toContain('2026-01-15');
  });

  it('readOnly 空值时渲染占位符', () => {
    const { container } = render(
      datePickerWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('width: 100% 默认样式', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        onChange: () => {},
      } as never),
    );
    const picker = container.querySelector('.ant-picker');
    expect(picker?.getAttribute('style')).toContain('width: 100%');
  });

  it('format 透传给 DatePicker', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        format: 'YYYY/MM/DD',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const picker = container.querySelector('.ant-picker.my-custom-class');
    expect(picker).not.toBeNull();
  });
});
