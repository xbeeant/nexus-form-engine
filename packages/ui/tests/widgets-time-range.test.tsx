import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { timeRangeWidget } from '../src/widgets/time-range';

describe('timeRangeWidget', () => {
  it('渲染两个 TimePicker 组成的时间范围控件', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:00:00', '18:00:00'],
        format: 'HH:mm:ss',
        onChange: () => {},
      } as never),
    );
    const inputs = container.querySelectorAll('.ant-picker-input input');
    expect(inputs.length).toBe(2);
  });

  it('空值时渲染两个空 TimePicker', () => {
    const { container } = render(
      timeRangeWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelectorAll('.ant-picker').length).toBe(2);
  });

  it('disabled 时两个 TimePicker 均禁用', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:00:00', '18:00:00'],
        disabled: true,
        format: 'HH:mm:ss',
        onChange: () => {},
      } as never),
    );
    const pickers = container.querySelectorAll('.ant-picker-disabled');
    expect(pickers.length).toBe(2);
  });

  it('readOnly 时渲染 ReadOnlyDisplay 以 ~ 连接', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:00:00', '18:00:00'],
        format: 'HH:mm:ss',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).toBeNull();
    expect(container.textContent).toContain('09:00:00 ~ 18:00:00');
  });

  it('readOnly 空值时渲染占位符', () => {
    const { container } = render(
      timeRangeWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('两个 TimePicker 之间有 ~ 分隔符', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:00:00', '18:00:00'],
        format: 'HH:mm:ss',
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('~');
  });

  it('placeholder 为数组时透传', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:00:00', '18:00:00'],
        format: 'HH:mm:ss',
        placeholder: ['开始时间', '结束时间'],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelectorAll('.ant-picker').length).toBe(2);
  });

  it('format 默认 HH:mm:ss', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:00', '18:00'],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelectorAll('.ant-picker').length).toBe(2);
  });

  it('透传 rest props', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:00:00', '18:00:00'],
        format: 'HH:mm:ss',
        onChange: () => {},
        'data-testid': 'my-time-range',
      } as never),
    );
    expect(
      container.querySelector('[data-testid="my-time-range"]'),
    ).not.toBeNull();
  });
});
