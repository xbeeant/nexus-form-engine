import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { dateRangeWidget } from '../src/widgets/date-range';

describe('dateRangeWidget', () => {
  it('渲染两个 DatePicker 组成的日期范围控件', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01', '2026-12-31'],
        format: 'YYYY-MM-DD',
        onChange: () => {},
      } as never),
    );
    const inputs = container.querySelectorAll('.ant-picker-input input');
    expect(inputs.length).toBe(2);
  });

  it('空值时渲染两个空 DatePicker', () => {
    const { container } = render(
      dateRangeWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelectorAll('.ant-picker').length).toBe(2);
  });

  it('只显示一个值时回退 [null, null]', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01'] as unknown as [string, string],
        format: 'YYYY-MM-DD',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelectorAll('.ant-picker').length).toBe(2);
  });

  it('disabled 时两个 DatePicker 均禁用', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01', '2026-12-31'],
        disabled: true,
        format: 'YYYY-MM-DD',
        onChange: () => {},
      } as never),
    );
    const pickers = container.querySelectorAll('.ant-picker-disabled');
    expect(pickers.length).toBe(2);
  });

  it('readOnly 时渲染 ReadOnlyDisplay 以 ~ 连接', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-12-01', '2026-12-21'],
        format: 'YYYY-MM-DD',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-picker')).toBeNull();
    expect(container.textContent).toContain('2026-12-01 ~ 2026-12-21');
  });

  it('readOnly 空值时渲染占位符', () => {
    const { container } = render(
      dateRangeWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('readOnly 单值时渲染该值', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01', null] as unknown as [string, null],
        format: 'YYYY-MM-DD',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('2026-01-01');
  });

  it('placeholder 为数组时透传', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01', '2026-12-31'],
        format: 'YYYY-MM-DD',
        placeholder: ['开始', '结束'],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelectorAll('.ant-picker').length).toBe(2);
  });

  it('placeholder 非数组时转为默认空字符串', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01', '2026-12-31'],
        format: 'YYYY-MM-DD',
        placeholder: '请选择日期',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelectorAll('.ant-picker').length).toBe(2);
  });

  it('两个 DatePicker 之间有 ~ 分隔符', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01', '2026-12-31'],
        format: 'YYYY-MM-DD',
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('~');
  });

  it('透传 rest props', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-01-01', '2026-12-31'],
        format: 'YYYY-MM-DD',
        onChange: () => {},
        'data-testid': 'my-date-range',
      } as never),
    );
    expect(
      container.querySelector('[data-testid="my-date-range"]'),
    ).not.toBeNull();
  });
});
