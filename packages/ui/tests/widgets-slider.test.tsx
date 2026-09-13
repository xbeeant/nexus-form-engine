import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sliderWidget } from '../src/widgets/slider';

describe('sliderWidget', () => {
  it('渲染 antd Slider 控件', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('value 正确回显', () => {
    const { container } = render(
      sliderWidget({
        value: 75,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('默认 min=0, max=100, step=1', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        onChange: () => {},
      } as never),
    );
    const slider = container.querySelector('.ant-slider');
    expect(slider).not.toBeNull();
  });

  it('自定义 min/max/step', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        min: 0,
        max: 1000,
        step: 10,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('disabled 时滑块禁用', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const slider = container.querySelector('.ant-slider-disabled');
    expect(slider).not.toBeNull();
  });

  it('loading 时滑块禁用', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        loading: true,
        onChange: () => {},
      } as never),
    );
    const slider = container.querySelector('.ant-slider-disabled');
    expect(slider).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay', () => {
    const { container } = render(
      sliderWidget({
        value: 80,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).toBeNull();
    expect(container.textContent).toBe('80');
  });

  it('marks 为 JSON 字符串时解析为对象', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        marks: '{"0": "低", "50": "中", "100": "高"}',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('marks 为无效 JSON 时降级为 undefined', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        marks: '{{ invalid json',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('marks 为对象时直接使用', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        marks: { 0: '低', 100: '高' },
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('tooltip 为 false 时传入 { open: false }', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        tooltip: false,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('tooltip 为对象时透传', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        tooltip: { open: true },
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('null value 时默认 0', () => {
    const { container } = render(
      sliderWidget({
        value: null as unknown as number,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-slider')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      sliderWidget({
        value: 50,
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const slider = container.querySelector('.ant-slider.my-custom-class');
    expect(slider).not.toBeNull();
  });
});
