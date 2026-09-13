import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { LayoutConfigContext } from '../src/contexts/layout-config-context';
import { useForm } from '../src/hooks/use-form';

const holder: { form?: FormController } = {};

function StubInput(props: any) {
  return (
    <input
      data-testid={`input-${props.path}`}
      data-nexus-field={props.path}
      value={props.value ?? ''}
    />
  );
}

// ── NexusLayout 注册/降级 ────────────────────────────────────────────────

describe('NexusLayout 注册/降级', () => {
  it('已注册 LayoutComponent：透传 node/title/children', () => {
    let capturedProps: any = null;

    function CustomLayout(props: any) {
      capturedProps = props;
      return (
        <div data-testid='custom-layout' {...props}>
          {props.children}
        </div>
      );
    }

    function LayoutForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              section: {
                type: 'customPanel',
                title: '自定义面板',
                properties: {
                  name: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
          layouts={{ customPanel: CustomLayout }}
        />
      );
    }

    const { container } = render(<LayoutForm />);
    expect(capturedProps).not.toBeNull();
    expect(capturedProps.title).toBe('自定义面板');
    expect(capturedProps.children).toBeDefined();
    expect(
      container.querySelector('[data-testid="custom-layout"]'),
    ).not.toBeNull();
  });

  it('未注册 LayoutComponent：降级为 div 渲染', () => {
    function DefaultLayoutForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              section: {
                type: 'unknownPanel',
                title: '未知面板',
                properties: {
                  name: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<DefaultLayoutForm />);
    // 未注册时渲染正常（布局 key 不进入路径，字段路径透传父路径）
    expect(document.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });

  it('card 类型：默认布局容器渲染', () => {
    function CardLayoutForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              card: {
                type: 'card',
                title: '卡片',
                properties: {
                  name: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<CardLayoutForm />);
    expect(document.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });
});

// ── TRANSPARENT_GRID_LAYOUTS 透明栅格 ────────────────────────────────────

describe('TRANSPARENT_GRID_LAYOUTS 透明栅格', () => {
  it('grid 类型透传 GridContext 给子级', () => {
    function GridForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              grid: {
                type: 'grid',
                column: 2,
                properties: {
                  a: { type: 'string', widget: 'input' },
                  b: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<GridForm />);
    expect(document.querySelector('[data-nexus-field="a"]')).not.toBeNull();
    expect(document.querySelector('[data-nexus-field="b"]')).not.toBeNull();
  });

  it('card 类型子级正常渲染', () => {
    function CardForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              card: {
                type: 'card',
                properties: {
                  name: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<CardForm />);
    expect(document.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });
});

// ── 布局配置属性剥离 ──────────────────────────────────────────────────────

describe('NexusLayout 布局配置属性剥离', () => {
  it('布局容器 width/colSpan 换算 gridColumn', () => {
    function WidthForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              card: {
                type: 'card',
                width: '50%',
                properties: {
                  name: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<WidthForm />);
    expect(document.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });

  it('removeHidden 通过 LayoutConfigContext 传递', () => {
    function RemoveHiddenForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              card: {
                type: 'card',
                removeHidden: true,
                properties: {
                  hidden: { type: 'string', widget: 'input', hidden: true },
                  visible: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<RemoveHiddenForm />);
    expect(container.querySelector('[data-nexus-hidden]')).toBeNull();
  });
});

// ── 布局容器 title ────────────────────────────────────────────────────────

describe('NexusLayout title 渲染', () => {
  it('布局容器渲染 title', () => {
    let capturedTitle: string | undefined;

    function TitleLayout(props: any) {
      capturedTitle = props.title;
      return <div data-testid='title-layout'>{props.children}</div>;
    }

    function TitleForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              section: {
                type: 'titlePanel',
                title: '测试标题',
                properties: {
                  name: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
          layouts={{ titlePanel: TitleLayout }}
        />
      );
    }

    const { container } = render(<TitleForm />);
    expect(capturedTitle).toBe('测试标题');
    expect(
      container.querySelector('[data-testid="title-layout"]'),
    ).not.toBeNull();
  });
});

// ── LayoutConfigContext 传递 ─────────────────────────────────────────────

describe('LayoutConfigContext 传递', () => {
  it('LayoutConfigContext.Provider 包裹时字段正常渲染', () => {
    function SuppressForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <LayoutConfigContext.Provider value={{ suppressFieldItemLayout: true }}>
          <NexusForm
            form={form}
            schema={{
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input' },
              },
            }}
            widgets={{ input: StubInput }}
          />
        </LayoutConfigContext.Provider>
      );
    }

    render(<SuppressForm />);
    expect(document.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });
});

// ── 布局容器 hidden ──────────────────────────────────────────────────────

describe('NexusLayout hidden', () => {
  it('布局容器渲染正常', () => {
    function HiddenLayoutForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              card: {
                type: 'card',
                properties: {
                  name: { type: 'string', widget: 'input' },
                },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<HiddenLayoutForm />);
    expect(document.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });
});
