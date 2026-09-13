import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { radioWidget } from '../src/widgets/radio';

describe('radioWidget', () => {
  it('渲染 antd Radio.Group 控件', () => {
    const { container } = render(
      radioWidget({
        value: 'a',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-radio-wrapper')).not.toBeNull();
  });

  it('value 匹配时对应选项选中', () => {
    const { container } = render(
      radioWidget({
        value: 'b',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    const checked = container.querySelector('.ant-radio-checked');
    expect(checked).not.toBeNull();
  });

  it('options 正确渲染为选项列表', () => {
    const { container } = render(
      radioWidget({
        value: 'a',
        options: [
          { label: '男', value: 'male' },
          { label: '女', value: 'female' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('男');
    expect(container.textContent).toContain('女');
  });

  it('disabled 时单选组禁用', () => {
    const { container } = render(
      radioWidget({
        value: 'a',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const radios = container.querySelectorAll('.ant-radio-disabled');
    expect(radios.length).toBeGreaterThan(0);
  });

  it('loading 时单选组禁用', () => {
    const { container } = render(
      radioWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        loading: true,
        onChange: () => {},
      } as never),
    );
    const radios = container.querySelectorAll('.ant-radio-disabled');
    expect(radios.length).toBeGreaterThan(0);
  });

  it('readOnly 时渲染 ReadOnlyDisplay + options', () => {
    const { container } = render(
      radioWidget({
        value: 'b',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-radio')).toBeNull();
    expect(container.textContent).toBe('选项 B');
  });

  it('无 options 时 readOnly 渲染 value', () => {
    const { container } = render(
      radioWidget({
        value: 'unknown',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('unknown');
  });

  it('透传 rest props', () => {
    const { container } = render(
      radioWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
        'data-testid': 'my-radio',
      } as never),
    );
    const wrapper = container.querySelector('[data-testid="my-radio"]');
    expect(wrapper).not.toBeNull();
  });

  it('空 options 不报错', () => {
    const { container } = render(
      radioWidget({
        value: undefined,
        options: [],
        onChange: () => {},
      } as never),
    );
    // antd Radio.Group 有空 options 时渲染结构仍存在
    expect(container.querySelector('.ant-radio-group')).not.toBeNull();
  });
});
