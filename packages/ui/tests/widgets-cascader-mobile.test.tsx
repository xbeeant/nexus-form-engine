import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cascaderMobileWidget } from '../src/widgets/cascader-mobile';

// Mock antd-mobile Cascader — 用简单 div 模拟
vi.mock('antd-mobile', () => ({
  Cascader: ({
    options,
    value,
    placeholder,
    disabled,
    className,
    ...rest
  }: any) => {
    return (
      <div
        className={`amc-cascader ${className || ''}`}
        data-disabled={disabled}
      >
        <div className='amc-cascader-value'>
          {value?.join(' / ') || placeholder || '请选择'}
        </div>
        {/* 渲染选项用于验证数据是否正确传入 */}
        {options?.map((opt: any, i: number) => (
          <div
            key={i}
            className='amc-cascader-option-item'
            data-value={opt.value}
          >
            {opt.label}
          </div>
        ))}
        {/* 透传 rest props */}
        {rest.testAttr && <span data-test-attr='passed'>{rest.testAttr}</span>}
      </div>
    );
  },
}));

describe('cascaderMobileWidget', () => {
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

  it('渲染 antd-mobile Cascader 控件', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: ['zone1', 'zone1-a'],
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('嵌套 options 正确渲染', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: undefined,
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('扁平 enum 作为叶子选项渲染', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: undefined,
        options: [
          { label: '北京', value: 'bj' },
          { label: '上海', value: 'sh' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('options 为 JSON 字符串时解析', () => {
    const jsonStr = JSON.stringify(nestedOptions);
    const { container } = render(
      cascaderMobileWidget({
        value: undefined,
        options: jsonStr as never,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('无法解析的 options 字符串不崩溃', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: undefined,
        options: 'not-json' as never,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('单值自动包装为数组', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: 'zone1',
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('null/undefined 值空数组处理', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: null,
        options: nestedOptions,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('disabled 时级联选择器禁用', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: ['zone1'],
        options: nestedOptions,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).not.toBeNull();
  });

  it('readOnly 时渲染 SimpleDisplay 级联标签', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: ['zone1', 'zone1-a'],
        options: nestedOptions,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).toBeNull();
    expect(container.textContent).toContain('区域 1');
  });

  it('readOnly 单值时渲染标签', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: 'zone2',
        options: nestedOptions,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).toBeNull();
    expect(container.textContent).toContain('区域 2');
  });

  it('readOnly 空值时渲染占位符', () => {
    const { container } = render(
      cascaderMobileWidget({
        value: undefined,
        options: nestedOptions,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.amc-cascader')).toBeNull();
    expect(container.textContent).toBe('-');
  });

  it('透传 rest props', () => {
    const { container } = render(
      cascaderMobileWidget({
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
