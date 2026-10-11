import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  EnumDisplay,
  ObjectDisplay,
  ReadOnlyDisplay,
  SimpleDisplay,
} from '../src/widgets/_shared';

function textOf(ui: React.ReactNode): string {
  const { container } = render(ui as React.ReactElement);
  return container.textContent ?? '';
}

// ── SimpleDisplay ──────────────────────────────────────────────────────────────

describe('SimpleDisplay（原始值纯文本展示）', () => {
  it('空值渲染占位符 -', () => {
    expect(textOf(<SimpleDisplay value={null} />)).toBe('-');
    expect(textOf(<SimpleDisplay value={undefined} />)).toBe('-');
    expect(textOf(<SimpleDisplay value='' />)).toBe('-');
  });

  it('布尔值本地化为 是/否', () => {
    expect(textOf(<SimpleDisplay value={true} />)).toBe('是');
    expect(textOf(<SimpleDisplay value={false} />)).toBe('否');
  });

  it('基础值原样展示', () => {
    expect(textOf(<SimpleDisplay value={42} />)).toBe('42');
    expect(textOf(<SimpleDisplay value='zhangsan' />)).toBe('zhangsan');
  });
});

// ── EnumDisplay ────────────────────────────────────────────────────────────────

describe('EnumDisplay（选项枚举映射展示）', () => {
  it('空值渲染占位符 -', () => {
    expect(textOf(<EnumDisplay value={null} />)).toBe('-');
    expect(textOf(<EnumDisplay value={undefined} />)).toBe('-');
    expect(textOf(<EnumDisplay value='' />)).toBe('-');
  });

  it('布尔值本地化为 是/否', () => {
    expect(textOf(<EnumDisplay value={true} />)).toBe('是');
    expect(textOf(<EnumDisplay value={false} />)).toBe('否');
  });

  it('options 枚举值映射为 label', () => {
    const options = [
      { label: '男', value: 1 },
      { label: '女', value: 2 },
    ];
    expect(textOf(<EnumDisplay value={1} options={options} />)).toBe('男');
    expect(textOf(<EnumDisplay value={2} options={options} />)).toBe('女');
  });

  it('未匹配回退 String', () => {
    const options = [{ label: '男', value: 1 }];
    expect(textOf(<EnumDisplay value={99} options={options} />)).toBe('99');
  });

  it('options 值与数字字符串混合时正确映射', () => {
    const options = [
      { label: '启用', value: 'on' },
      { label: '禁用', value: 'off' },
    ];
    expect(textOf(<EnumDisplay value='on' options={options} />)).toBe('启用');
  });

  it('基础值数组用顿号拼接', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
    ];
    expect(
      textOf(<EnumDisplay value={['a', 'b', 'c']} options={options} />),
    ).toBe('A、B、C');
  });

  it('空数组渲染占位符', () => {
    expect(textOf(<EnumDisplay value={[]} />)).toBe('-');
  });
});

// ── ObjectDisplay ──────────────────────────────────────────────────────────────

describe('ObjectDisplay（结构化键值块展示）', () => {
  it('空值渲染占位符 -', () => {
    expect(textOf(<ObjectDisplay value={null} />)).toBe('-');
    expect(textOf(<ObjectDisplay value={undefined} />)).toBe('-');
    expect(textOf(<ObjectDisplay value='' />)).toBe('-');
  });

  it('对象数组逐项渲染', () => {
    const { container } = render(
      <ObjectDisplay value={[{ name: '张三', age: 18 }]} />,
    );
    const html = container.innerHTML;
    expect(html).toContain('张三');
    expect(html).toContain('18');
  });

  it('普通对象渲染为键值块', () => {
    const { container } = render(
      <ObjectDisplay value={{ city: '北京', code: '110000' }} />,
    );
    const html = container.innerHTML;
    expect(html).toContain('city');
    expect(html).toContain('北京');
    expect(html).toContain('code');
    expect(html).toContain('110000');
  });

  it('空对象渲染占位符', () => {
    expect(textOf(<ObjectDisplay value={{}} />)).toBe('-');
  });

  it('嵌套深度超过 3 层回退 JSON 序列化', () => {
    const value = { a: { b: { c: { d: { e: 1 } } } } };
    expect(textOf(<ObjectDisplay value={value} />)).toContain(
      JSON.stringify({ d: { e: 1 } }),
    );
  });

  it('Date / Dayjs 走 String', () => {
    const d = new Date('2024-01-01');
    expect(textOf(<ObjectDisplay value={d} />)).toBe(String(d));
  });

  it('基础值走 String', () => {
    expect(textOf(<ObjectDisplay value={42} />)).toBe('42');
    expect(textOf(<ObjectDisplay value='hello' />)).toBe('hello');
  });
});

// ── ReadOnlyDisplay（向后兼容保留） ─────────────────────────────────────────────

describe('ReadOnlyDisplay（只读文本回退，向后兼容）', () => {
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
