import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReadOnlyDisplay } from '../src/widgets/_shared';

function textOf(ui: React.ReactNode): string {
  const { container } = render(ui as React.ReactElement);
  return container.textContent ?? '';
}

describe('ReadOnlyDisplay（只读文本回退）', () => {
  it('空值渲染占位符 -', () => {
    expect(textOf(<ReadOnlyDisplay value={null} />)).toBe('-');
    expect(textOf(<ReadOnlyDisplay value={undefined} />)).toBe('-');
    expect(textOf(<ReadOnlyDisplay value='' />)).toBe('-');
  });

  it('布尔值本地化为 是/否', () => {
    expect(textOf(<ReadOnlyDisplay value={true} />)).toBe('是');
    expect(textOf(<ReadOnlyDisplay value={false} />)).toBe('否');
  });

  it('基础值原样展示', () => {
    expect(textOf(<ReadOnlyDisplay value={42} />)).toBe('42');
    expect(textOf(<ReadOnlyDisplay value='zhangsan' />)).toBe('zhangsan');
  });

  it('options 枚举值映射为 label', () => {
    const options = [
      { label: '男', value: 1 },
      { label: '女', value: 2 },
    ];
    expect(textOf(<ReadOnlyDisplay value={1} options={options} />)).toBe('男');
    expect(textOf(<ReadOnlyDisplay value={2} options={options} />)).toBe('女');
  });

  it('基础值数组用顿号拼接', () => {
    expect(textOf(<ReadOnlyDisplay value={['a', 'b', 'c']} />)).toBe('a、b、c');
  });

  it('空数组渲染占位符', () => {
    expect(textOf(<ReadOnlyDisplay value={[]} />)).toBe('-');
  });

  it('对象数组逐项渲染', () => {
    const { container } = render(
      <ReadOnlyDisplay value={[{ name: '张三', age: 18 }]} />,
    );
    const html = container.innerHTML;
    expect(html).toContain('张三');
    expect(html).toContain('18');
  });

  it('普通对象渲染为键值块', () => {
    const { container } = render(
      <ReadOnlyDisplay value={{ city: '北京', code: '110000' }} />,
    );
    const html = container.innerHTML;
    expect(html).toContain('city');
    expect(html).toContain('北京');
    expect(html).toContain('code');
    expect(html).toContain('110000');
  });

  it('空对象渲染占位符', () => {
    expect(textOf(<ReadOnlyDisplay value={{}} />)).toBe('-');
  });

  it('嵌套深度超过 3 层回退 JSON 序列化', () => {
    const value = { a: { b: { c: { d: { e: 1 } } } } };
    // depth >= 3 时仅 JSON 化最深层节点（外层键名仍按键值块渲染）
    expect(textOf(<ReadOnlyDisplay value={value} />)).toContain(
      JSON.stringify({ d: { e: 1 } }),
    );
  });

  it('options 值与数字字符串混合时正确映射', () => {
    const options = [
      { label: '启用', value: 'on' },
      { label: '禁用', value: 'off' },
    ];
    expect(textOf(<ReadOnlyDisplay value='on' options={options} />)).toBe(
      '启用',
    );
  });
});
