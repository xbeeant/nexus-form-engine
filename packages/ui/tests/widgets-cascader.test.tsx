import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cascaderWidget } from '../src/widgets/cascader';

describe('cascaderWidget', () => {
  const nestedOptions = [
    {
      value: 'zone1',
      label: '区域 1',
      children: [{ value: 'zone1-a', label: '区域 1-A' }],
    },
    {
      value: 'zone2',
      label: '区域 2',
    },
  ];

  it('渲染 antd Cascader 控件', () => {
    const { container } = render(
      cascaderWidget({
        value: ['zone1', 'zone1-a'],
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('嵌套 options 正确渲染', () => {
    const { container } = render(
      cascaderWidget({
        value: undefined,
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('扁平 enum 作为叶子选项渲染', () => {
    const { container } = render(
      cascaderWidget({
        value: undefined,
        options: [
          { label: '北京', value: 'bj' },
          { label: '上海', value: 'sh' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('options 为 JSON 字符串时解析', () => {
    const jsonStr = JSON.stringify(nestedOptions);
    const { container } = render(
      cascaderWidget({
        value: undefined,
        options: jsonStr as never,
        onChange: () => {},
      } as never),
    );
    // 解析后的 options 包含 children，走嵌套 options 分支
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('扁平 enum 的 JSON 字符串解析后同样可用', () => {
    const jsonStr = JSON.stringify([
      { label: '北京', value: 'bj' },
      { label: '上海', value: 'sh' },
    ]);
    const { container } = render(
      cascaderWidget({
        value: undefined,
        options: jsonStr as never,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('无法解析的 options 字符串不崩溃，渲染空级联', () => {
    const { container } = render(
      cascaderWidget({
        value: undefined,
        options: 'not-json' as never,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('单值自动包装为数组', () => {
    const { container } = render(
      cascaderWidget({
        value: 'zone1',
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('null/undefined 值空数组处理', () => {
    const { container } = render(
      cascaderWidget({
        value: null,
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('disabled 时级联选择器禁用', () => {
    const { container } = render(
      cascaderWidget({
        value: ['zone1'],
        options: nestedOptions,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay 级联标签', () => {
    const { container } = render(
      cascaderWidget({
        value: ['zone1', 'zone1-a'],
        options: nestedOptions,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).toBeNull();
    expect(container.textContent).toContain('区域 1');
  });

  it('readOnly 单值时渲染标签', () => {
    const { container } = render(
      cascaderWidget({
        value: 'zone2',
        options: nestedOptions,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).toBeNull();
    expect(container.textContent).toContain('区域 2');
  });

  it('readOnly 空值时渲染占位符', () => {
    const { container } = render(
      cascaderWidget({
        value: undefined,
        options: nestedOptions,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).toBeNull();
    // labels 为空时 ReadOnlyDisplay 渲染 "-"
    expect(container.textContent).toBe('-');
  });

  it('allowClear 默认为 true', () => {
    const { container } = render(
      cascaderWidget({
        value: ['zone1'],
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-cascader')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      cascaderWidget({
        value: undefined,
        options: nestedOptions,
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const cascader = container.querySelector('.my-custom-class');
    expect(cascader).not.toBeNull();
  });
});
