import { NexusEngine, type NexusSchema } from '@xbeeant/form-engine';
import { NexusFormProvider } from '@xbeeant/form-engine-react';
import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { collapseLayout } from '../src/layouts/collapse';

// collapseLayout 内部使用 Hooks（订阅面板 hidden），必须以组件形态渲染
// （不可像纯函数那样直接调用，否则 Hook 调度器为空）
function renderCollapse(props: Record<string, unknown>) {
  return render(createElement(collapseLayout as never, props as never));
}

/**
 * 构造含 collapse + collapsePanel 的 Schema，并初始化引擎
 *
 * 面板的 UI 状态路径由解析器合成：collapse.<panelKey>（containerOnly 状态），
 * 布局 Key 不进入 formData 数据路径。
 */
function createEngine(panelKeys: string[], hiddenKeys: string[] = []) {
  const properties: Record<string, unknown> = {};
  for (const key of panelKeys) {
    properties[key] = {
      type: 'collapsePanel',
      title: `面板-${key}`,
      hidden: hiddenKeys.includes(key),
      properties: {
        [`field_${key}`]: { type: 'string', widget: 'input', title: key },
      },
    };
  }

  const engine = new NexusEngine();
  engine.init({
    type: 'object',
    properties: {
      collapse: { type: 'collapse', title: '折叠分组', properties },
    },
  } as unknown as NexusSchema);
  return engine;
}

/** 在 NexusFormProvider 内渲染真实解析产物（渲染树 collapse 节点 + 面板 children） */
function renderWithEngine(panelKeys: string[], hiddenKeys: string[] = []) {
  const engine = createEngine(panelKeys, hiddenKeys);
  const collapseNode = (engine.getRenderTree() as any[]).find(
    (node) => node.type === 'collapse',
  );
  const children = collapseNode.children.map((panel: any, i: number) =>
    createElement('div', { key: i }, `内容-${panel.props?.title ?? i}`),
  );

  const { container } = render(
    createElement(
      NexusFormProvider,
      {
        engine,
        form: { _getEngine: () => engine } as never,
        config: { displayType: 'row', label: true } as never,
      },
      createElement(
        collapseLayout as never,
        {
          node: collapseNode,
          children,
        } as never,
      ),
    ),
  );
  return { container, engine, collapseNode };
}

describe('collapseLayout', () => {
  const node = {
    children: [
      { title: '面板 1', key: '0' },
      { title: '面板 2', key: '1' },
    ],
  };

  it('渲染 antd Collapse 组件', () => {
    const { container } = renderCollapse({
      node,
      children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
    });
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('面板标题正确显示', () => {
    const { container } = renderCollapse({
      node,
      children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
    });
    expect(container.textContent).toContain('面板 1');
    expect(container.textContent).toContain('面板 2');
  });

  it('默认展开第一个面板', () => {
    const { container } = renderCollapse({
      node,
      children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
    });
    expect(container.textContent).toContain('内容 1');
  });

  it('defaultActiveKey 控制展开面板', () => {
    const { container } = renderCollapse({
      node,
      children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      defaultActiveKey: ['1'],
    });
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('空节点不崩溃', () => {
    const { container } = renderCollapse({ node: undefined, children: [] });
    // 无任何面板时整个 Collapse 不渲染（不抛错即通过）
    expect(container.querySelector('.ant-collapse')).toBeNull();
  });

  it('空 children 不崩溃', () => {
    const { container } = renderCollapse({
      node: { children: [{ title: '面板' }] },
      children: [],
    });
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('无 title 时使用默认面板名', () => {
    const { container } = renderCollapse({
      node: { children: [{}] },
      children: [<div key='0'>内容</div>],
    });
    expect(container.textContent).toContain('面板 1');
  });

  it('panel props 透传', () => {
    const { container } = renderCollapse({
      node: { children: [{ title: '面板', props: { extra: '操作' } }] },
      children: [<div key='0'>内容</div>],
    });
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('无引擎上下文时静态 hidden 面板被过滤', () => {
    const { container } = renderCollapse({
      node: {
        children: [
          { title: '面板 1' },
          { title: '面板 2', meta: { schema: { hidden: true } } },
        ],
      },
      children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
    });
    expect(container.textContent).toContain('面板 1');
    expect(container.textContent).not.toContain('面板 2');
  });

  it('无引擎上下文时全部面板 hidden → 不渲染 Collapse', () => {
    const { container } = renderCollapse({
      node: {
        children: [
          { title: '面板 1', meta: { schema: { hidden: true } } },
          { title: '面板 2', meta: { schema: { hidden: true } } },
        ],
      },
      children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
    });
    expect(container.querySelector('.ant-collapse')).toBeNull();
  });
});

describe('collapseLayout（引擎联动实时显隐）', () => {
  it('部分面板 hidden 时仅渲染可见面板', () => {
    const { container } = renderWithEngine(['p1', 'p2'], ['p2']);
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
    expect(container.textContent).toContain('面板-p1');
    expect(container.textContent).not.toContain('面板-p2');
  });

  it('全部面板 hidden 时整个 Collapse 不显示', () => {
    const { container } = renderWithEngine(['p1', 'p2'], ['p1', 'p2']);
    expect(container.querySelector('.ant-collapse')).toBeNull();
  });

  it('运行时翻转 hidden → 面板实时增减', () => {
    const { container, engine } = renderWithEngine(['p1', 'p2']);
    expect(container.textContent).toContain('面板-p1');
    expect(container.textContent).toContain('面板-p2');

    // 隐藏 p1（panel 的 UI 状态路径由布局 Key 合成，不进入数据路径）
    act(() => {
      engine.setFieldState('collapse.p1', { hidden: true });
    });
    expect(container.textContent).not.toContain('面板-p1');
    expect(container.textContent).toContain('面板-p2');

    // 恢复显示后重新出现
    act(() => {
      engine.setFieldState('collapse.p1', { hidden: false });
    });
    expect(container.textContent).toContain('面板-p1');
  });

  it('运行时全部隐藏 → 容器消失；恢复后容器重新出现', () => {
    const { container, engine } = renderWithEngine(['p1']);
    expect(container.querySelector('.ant-collapse')).not.toBeNull();

    act(() => {
      engine.setFieldState('collapse.p1', { hidden: true });
    });
    expect(container.querySelector('.ant-collapse')).toBeNull();

    act(() => {
      engine.setFieldState('collapse.p1', { hidden: false });
    });
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('hidden 表达式联动 → 面板实时显隐', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'input', title: '模式' },
        collapse: {
          type: 'collapse',
          title: '折叠分组',
          properties: {
            p1: {
              type: 'collapsePanel',
              title: '面板-p1',
              hidden: "{{ formData.mode === 'b' }}",
              properties: { field_p1: { type: 'string', widget: 'input' } },
            },
            p2: {
              type: 'collapsePanel',
              title: '面板-p2',
              properties: { field_p2: { type: 'string', widget: 'input' } },
            },
          },
        },
      },
    } as unknown as NexusSchema);

    const collapseNode = (engine.getRenderTree() as any[]).find(
      (node) => node.type === 'collapse',
    );
    const children = collapseNode.children.map((_panel: any, i: number) =>
      createElement('div', { key: i }, `内容-${i}`),
    );

    const { container } = render(
      createElement(
        NexusFormProvider,
        {
          engine,
          form: { _getEngine: () => engine } as never,
          config: { displayType: 'row', label: true } as never,
        },
        createElement(
          collapseLayout as never,
          {
            node: collapseNode,
            children,
          } as never,
        ),
      ),
    );

    expect(container.textContent).toContain('面板-p1');

    // 联动源字段变化 → 面板 hidden 表达式重算 → Collapse 实时收敛
    act(() => {
      engine.setFieldValue('mode', 'b');
    });
    expect(container.textContent).not.toContain('面板-p1');
    expect(container.textContent).toContain('面板-p2');

    act(() => {
      engine.setFieldValue('mode', 'a');
    });
    expect(container.textContent).toContain('面板-p1');
  });
});
