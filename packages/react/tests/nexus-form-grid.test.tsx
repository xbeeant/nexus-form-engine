import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

// ── NexusForm 顶层 24 栅格布局渲染测试 ──────────────────────────────────────
// 语义：整个表单（非 inline）为统一 24 栅格容器；
// - 字段 width（占比百分比）换算为 gridColumn: span round(24×比例)
// - 未设置 width/colSpan 的字段按表单级 column 均分默认占位

function StubInput(props: any) {
  return (
    <input
      data-testid={`input-${props.path}`}
      value={props.value ?? ''}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        props.onChange(e.target.value)
      }
    />
  );
}

function TestForm({
  schema,
  column,
  displayType,
}: {
  schema: unknown;
  column?: number;
  displayType?: 'row' | 'column' | 'inline';
}) {
  const [form] = useForm();
  return (
    <NexusForm
      form={form as FormController}
      schema={schema as never}
      column={column}
      displayType={displayType}
      widgets={{ input: StubInput }}
    />
  );
}

const twoFieldSchema = {
  type: 'object',
  properties: {
    a: { type: 'string', widget: 'input', title: 'A' },
    b: { type: 'string', widget: 'input', title: 'B' },
  },
};

describe('NexusForm 24 栅格布局', () => {
  it('表单顶层渲染 24 栅格容器（repeat(24, ...)），字段默认全宽（column=1）', () => {
    const { container } = render(<TestForm schema={twoFieldSchema} />);
    const grid = container.querySelector(
      '[data-nexus-form-grid]',
    ) as HTMLDivElement;
    expect(grid).toBeTruthy();
    expect(grid.style.gridTemplateColumns).toContain('repeat(24');
    // 无 width 字段默认占 24 格（全宽堆叠）
    const fields = container.querySelectorAll('[data-nexus-field]');
    expect(fields[0]).toMatchObject({ style: { gridColumn: 'span 24' } });
    expect(fields[1]).toMatchObject({ style: { gridColumn: 'span 24' } });
  });

  it('column=2 时无 width 字段默认占 12 格（一行两列等宽）', () => {
    const { container } = render(
      <TestForm schema={twoFieldSchema} column={2} />,
    );
    const fields = container.querySelectorAll('[data-nexus-field]');
    expect(fields[0]).toMatchObject({ style: { gridColumn: 'span 12' } });
    expect(fields[1]).toMatchObject({ style: { gridColumn: 'span 12' } });
  });

  it('字段 width 百分比换算为 24 栅格跨度（占整个表单宽度占比）', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', width: '50%' },
        b: { type: 'string', widget: 'input', width: '25%' },
      },
    };
    const { container } = render(<TestForm schema={schema} column={2} />);
    const fields = container.querySelectorAll('[data-nexus-field]');
    // 50% → span 12；25% → span 6（width 优先级高于 column 均分）
    expect(fields[0]).toMatchObject({ style: { gridColumn: 'span 12' } });
    expect(fields[1]).toMatchObject({ style: { gridColumn: 'span 6' } });
  });

  it('显式 colSpan 以 24 栅格单位优先于 width 生效', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', width: '50%', colSpan: 8 },
      },
    };
    const { container } = render(<TestForm schema={schema} />);
    const field = container.querySelector(
      '[data-nexus-field]',
    ) as HTMLDivElement;
    expect(field.style.gridColumn).toBe('span 8');
  });

  it('inline 布局不套 24 栅格（保持行内流式），字段宽度字面生效', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', width: '50%' },
      },
    };
    const { container } = render(
      <TestForm schema={schema} displayType='inline' />,
    );
    expect(container.querySelector('[data-nexus-form-grid]')).toBeNull();
    const field = container.querySelector(
      '[data-nexus-field]',
    ) as HTMLDivElement;
    // 非栅格场景 width 字面生效（内联样式宽度 50%）
    expect((field.style as CSSStyleDeclaration).width).toBe('50%');
    expect((field.style as CSSStyleDeclaration).gridColumn).toBe('');
  });

  it('数据对象容器 width 占比换算为 24 栅格跨度（gridColumn 应用在外层）', () => {
    const schema = {
      type: 'object',
      properties: {
        halfObj: {
          type: 'object',
          width: '50%',
          title: '半宽对象',
          properties: {
            innerA: { type: 'string', widget: 'input', title: '内部 A' },
          },
        },
        fullObj: {
          type: 'object',
          colSpan: 12,
          title: 'colSpan 12 对象',
          properties: {
            innerB: { type: 'string', widget: 'input', title: '内部 B' },
          },
        },
      },
    };
    const { container } = render(<TestForm schema={schema} />);
    const objects = container.querySelectorAll('[data-nexus-object]');
    // 数据对象自身是栅格项：width/colSpan 换算 gridColumn 应用在外层对象
    expect(objects[0]).toMatchObject({ style: { gridColumn: 'span 12' } });
    expect(objects[1]).toMatchObject({ style: { gridColumn: 'span 12' } });
    // 对象内部字段在自己的内容栅格内占全宽（column=1），不受对象外层跨度影响
    const fields = container.querySelectorAll('[data-nexus-field]');
    expect(fields[0]).toMatchObject({ style: { gridColumn: 'span 24' } });
    expect(fields[1]).toMatchObject({ style: { gridColumn: 'span 24' } });
  });

  it('点击对象标题折叠时内层内容 display:none（内联样式，不被 grid 覆盖）', () => {
    const schema = {
      type: 'object',
      properties: {
        group: {
          type: 'object',
          title: '分组',
          properties: {
            inner: { type: 'string', widget: 'input', title: '内部' },
          },
        },
      },
    };
    const { container } = render(<TestForm schema={schema} />);
    const objectEl = container.querySelector(
      '[data-nexus-object]',
    ) as HTMLDivElement;
    // 内层内容 div（唯一带 gridTemplateColumns 内联样式的子元素）
    const content = objectEl.querySelector(
      'div[style*="repeat(24"]',
    ) as HTMLDivElement;
    expect(content.style.display).toBe('grid');
    // 点击标题折叠（标题 div 是对象外层第一个子元素）
    act(() => {
      (objectEl.querySelector('div') as HTMLDivElement).click();
    });
    expect(content.style.display).toBe('none');
    // 内层字段仍存在（未卸载，保持状态）
    expect(objectEl.querySelector('[data-nexus-field]')).toBeTruthy();
  });
});
