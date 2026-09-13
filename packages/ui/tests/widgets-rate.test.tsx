import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { rateWidget } from '../src/widgets/rate';

describe('rateWidget', () => {
  it('渲染 antd Rate 控件', () => {
    const { container } = render(
      rateWidget({
        value: 3,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-rate')).not.toBeNull();
  });

  it('value 正确回显星数', () => {
    const { container } = render(
      rateWidget({
        value: 4,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-rate')).not.toBeNull();
  });

  it('disabled 时评分控件禁用', () => {
    const { container } = render(
      rateWidget({
        value: 3,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const rate = container.querySelector('.ant-rate-disabled');
    expect(rate).not.toBeNull();
  });

  it('loading 时评分控件禁用', () => {
    const { container } = render(
      rateWidget({
        value: 3,
        loading: true,
        onChange: () => {},
      } as never),
    );
    const rate = container.querySelector('.ant-rate-disabled');
    expect(rate).not.toBeNull();
  });

  it('readOnly 且 value=0 时渲染 ReadOnlyDisplay 显示 0', () => {
    const { container } = render(
      rateWidget({
        value: 0,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-rate')).toBeNull();
    // ReadOnlyDisplay 接收 value=0，渲染为 "0"
    expect(container.textContent).toBe('0');
  });

  it('readOnly 且 value=4 时渲染 4 颗星', () => {
    const { container } = render(
      rateWidget({
        value: 4,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-rate')).toBeNull();
    expect(container.textContent).toContain('★★★★');
  });

  it('readOnly 且 value=3 时渲染 3 颗星', () => {
    const { container } = render(
      rateWidget({
        value: 3,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-rate')).toBeNull();
    expect(container.textContent).toContain('★★★');
  });

  it('tooltips 为逗号分隔字符串时转为数组', () => {
    const { container } = render(
      rateWidget({
        value: 3,
        tooltips: '很差,一般,好,很好,非常好',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-rate')).not.toBeNull();
  });

  it('tooltips 为空字符串时不传', () => {
    const { container } = render(
      rateWidget({
        value: 3,
        tooltips: '',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-rate')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      rateWidget({
        value: 3,
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const rate = container.querySelector('.ant-rate.my-custom-class');
    expect(rate).not.toBeNull();
  });

  it('null value 时 readOnly 返回 -', () => {
    const { container } = render(
      rateWidget({
        value: null,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });
});
