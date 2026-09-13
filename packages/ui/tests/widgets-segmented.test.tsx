import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { segmentedWidget } from '../src/widgets/segmented';

describe('segmentedWidget', () => {
  it('渲染 antd Segmented 控件', () => {
    const { container } = render(
      segmentedWidget({
        value: 'a',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-segmented')).not.toBeNull();
  });

  it('value 正确回显', () => {
    const { container } = render(
      segmentedWidget({
        value: 'b',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('选项 A');
    expect(container.textContent).toContain('选项 B');
  });

  it('options 通过 mapOptions 转换后渲染', () => {
    const { container } = render(
      segmentedWidget({
        value: undefined,
        options: [
          { label: '苹果', value: 'apple' },
          { label: '香蕉', value: 'banana' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('苹果');
    expect(container.textContent).toContain('香蕉');
  });

  it('disabled 时分段控件禁用', () => {
    const { container } = render(
      segmentedWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const segmented = container.querySelector('.ant-segmented-disabled');
    expect(segmented).not.toBeNull();
  });

  it('loading 时分段控件禁用', () => {
    const { container } = render(
      segmentedWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        loading: true,
        onChange: () => {},
      } as never),
    );
    const segmented = container.querySelector('.ant-segmented-disabled');
    expect(segmented).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay + options', () => {
    const { container } = render(
      segmentedWidget({
        value: 'b',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-segmented')).toBeNull();
    expect(container.textContent).toBe('选项 B');
  });

  it('readOnly 时无 options 渲染 value', () => {
    const { container } = render(
      segmentedWidget({
        value: 'unknown',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-segmented')).toBeNull();
    expect(container.textContent).toBe('unknown');
  });

  it('block 模式', () => {
    const { container } = render(
      segmentedWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        block: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-segmented')).not.toBeNull();
  });

  it('size 属性透传', () => {
    const { container } = render(
      segmentedWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        size: 'small',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-segmented')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      segmentedWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
        'data-testid': 'my-segmented',
      } as never),
    );
    const segmented = container.querySelector(
      '.ant-segmented[data-testid="my-segmented"]',
    );
    expect(segmented).not.toBeNull();
  });
});
