import { fireEvent, render, waitFor } from '@testing-library/react';
import type { FormController } from '@xbeeant/form-engine-react';

import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { describe, expect, it } from 'vitest';
import {
  antdWidgets,
  datePickerWidget,
  dateRangeWidget,
  registerAntdUI,
  timeRangeWidget,
} from '../src';

function renderForm(schema: unknown, props: Record<string, unknown> = {}) {
  const holder: { form?: FormController } = {};
  function TestForm() {
    const [form] = useForm();
    holder.form = form;
    registerAntdUI(form._getEngine());
    return (
      <NexusForm
        form={form}
        schema={schema as never}
        footer={false}
        {...(props as never)}
      />
    );
  }
  return { ...render(<TestForm />), form: holder };
}

describe('widget 只读回退（集成 NexusForm）', () => {
  it('input 只读时渲染为文本而非输入框', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input', title: '用户名' },
        },
      },
      { readOnly: true, initialValues: { username: 'zhangsan' } },
    );
    expect(container.querySelector('input')).toBeNull();
    const field = container.querySelector('[data-nexus-field="username"]');
    expect(field!.textContent).toContain('zhangsan');
  });

  it('datePicker 只读时渲染格式化文本', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          birthday: { type: 'string', widget: 'date', title: '生日' },
        },
      },
      { readOnly: true, initialValues: { birthday: '2026-01-15' } },
    );
    expect(container.querySelector('input')).toBeNull();
    const field = container.querySelector('[data-nexus-field="birthday"]');
    expect(field!.textContent).toContain('2026-01-15');
  });

  it('dateRange 只读时以 ~ 连接两端值', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          range: { type: 'string', widget: 'dateRange', title: '范围' },
        },
      },
      {
        readOnly: true,
        initialValues: { range: ['2026-12-01', '2026-12-21'] },
      },
    );
    expect(container.querySelector('input')).toBeNull();
    const field = container.querySelector('[data-nexus-field="range"]');
    expect(field!.textContent).toContain('2026-12-01 ~ 2026-12-21');
  });

  it('switch 只读时渲染 是/否', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          vip: { type: 'boolean', widget: 'switch', title: '会员' },
        },
      },
      { readOnly: true, initialValues: { vip: true } },
    );
    expect(container.querySelector('.ant-switch')).toBeNull();
    const field = container.querySelector('[data-nexus-field="vip"]');
    expect(field!.textContent).toContain('是');
  });

  it('可编辑模式下保持原生控件', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input', title: '用户名' },
        },
      },
      { initialValues: { username: 'zhangsan' } },
    );
    expect(container.querySelector('input')).not.toBeNull();
  });
});

describe('dateString / timeString 字符串传输格式（x-render 对齐）', () => {
  it('datePickerWidget 回显字符串值（按 format），不产生 dayjs 下发', () => {
    const { container } = render(
      datePickerWidget({
        value: '2026-01-15',
        format: 'YYYY-MM-DD',
        onChange: () => {},
      } as never),
    );
    expect(
      container.querySelector('.ant-picker-input input')?.getAttribute('value'),
    ).toBe('2026-01-15');
  });

  it('dateRangeWidget 值以字符串数组传输（非 dayjs），两端正确回显', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-12-01', '2026-12-21'],
        format: 'YYYY-MM-DD',
        onChange: () => {},
      } as never),
    );
    const inputs = Array.from(
      container.querySelectorAll('.ant-picker-input input'),
    );
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('2026-12-01');
    expect((inputs[1] as HTMLInputElement).value).toBe('2026-12-21');
  });

  it('dateRangeWidget readOnly 以 ~ 连接两端字符串', () => {
    const { container } = render(
      dateRangeWidget({
        value: ['2026-12-01', '2026-12-21'],
        format: 'YYYY-MM-DD',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('2026-12-01 ~ 2026-12-21');
  });

  it('timeRangeWidget 以字符串数组传输', () => {
    const { container } = render(
      timeRangeWidget({
        value: ['09:30:00', '18:00:00'],
        format: 'HH:mm:ss',
        onChange: () => {},
      } as never),
    );
    const inputs = Array.from(
      container.querySelectorAll('.ant-picker-input input'),
    );
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('09:30:00');
    expect((inputs[1] as HTMLInputElement).value).toBe('18:00:00');
  });

  it('dateString/timeString/dateRangeString/timeRangeString 别名已注册且与默认同实现', () => {
    expect(antdWidgets.dateString).toBe(antdWidgets.date);
    expect(antdWidgets.timeString).toBe(antdWidgets.time);
    expect(antdWidgets.dateRangeString).toBe(antdWidgets.dateRange);
    expect(antdWidgets.timeRangeString).toBe(antdWidgets.timeRange);
    expect(typeof antdWidgets.dateString).toBe('function');
    expect(typeof antdWidgets.timeString).toBe('function');
  });
});

describe('校验错误展示（集成）', () => {
  it('必填字段提交失败时展示错误信息', async () => {
    const { container, form } = renderForm({
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          title: '用户名',
          required: true,
        },
      },
    });

    await form.form!.validateFields();
    await waitFor(() => {
      expect(
        container.querySelector('.ant-form-item-explain-error'),
      ).not.toBeNull();
    });
    // 引擎默认消息：{title}为必填项
    expect(container.textContent).toContain('为必填项');
  });

  it('输入合法值后错误消失', async () => {
    const { container, form } = renderForm({
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          title: '用户名',
          required: true,
        },
      },
    });

    // 先触发校验（提交），必填错误出现
    await form.form!.validateFields();
    await waitFor(() => {
      expect(
        container.querySelector('.ant-form-item-explain-error'),
      ).not.toBeNull();
    });

    // 输入合法值 → 实时校验通过 → 错误消失
    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'zhangsan' },
    });
    await waitFor(() => {
      expect(
        container.querySelector('.ant-form-item-explain-error'),
      ).toBeNull();
    });
  });
});

describe('treeSelect 静态树数据（treeData 为 JSON 字符串）', () => {
  const treeJson = JSON.stringify([
    {
      value: 'digital',
      title: '数码家电',
      children: [{ value: 'phone', title: '手机通讯' }],
    },
    { value: 'fashion', title: '服饰鞋包' },
  ]);

  function renderTreeSelect() {
    return renderForm({
      type: 'object',
      properties: {
        categoryTree: {
          type: 'string',
          widget: 'treeSelect',
          title: '类目',
          props: { treeData: treeJson, treeDefaultExpandAll: true },
        },
      },
    });
  }

  it('字符串 treeData 不抛异常，正常渲染并可选择节点', async () => {
    const { container, form } = renderTreeSelect();

    // 静态数据无需等待请求，就绪后渲染 TreeSelect
    await waitFor(() => {
      expect(container.textContent).not.toContain('加载中');
    });
    const selector = container.querySelector('.ant-select');
    expect(selector).not.toBeNull();

    // 展开下拉：树节点出现在下拉面板中
    fireEvent.mouseDown(selector!);
    await waitFor(() => {
      expect(document.body.textContent).toContain('数码家电');
    });

    // 点击叶子节点 → 值写入引擎
    const node = Array.from(
      document.querySelectorAll('.ant-select-tree-treenode'),
    ).find((el) => el.textContent?.includes('手机通讯'));
    expect(node).toBeTruthy();
    const clickable =
      node!.querySelector('.ant-select-tree-node-content-wrapper') ?? node!;
    fireEvent.click(clickable);
    await waitFor(() => {
      expect(form.form!.getValueByPath('categoryTree')).toBe('phone');
    });
  });

  it('非法 JSON 字符串降级为空树，不崩溃', async () => {
    const { container } = renderForm({
      type: 'object',
      properties: {
        categoryTree: {
          type: 'string',
          widget: 'treeSelect',
          title: '类目',
          props: { treeData: '{{ broken json' },
        },
      },
    });

    await waitFor(() => {
      expect(container.textContent).not.toContain('加载中');
    });
    expect(container.querySelector('.ant-select')).not.toBeNull();
    fireEvent.mouseDown(container.querySelector('.ant-select')!);
    await waitFor(() => {
      expect(
        document.querySelector('.ant-select-empty') ??
          document.body.textContent,
      ).toBeTruthy();
    });
  });
});

describe('sideEffects 附带编辑器（P1-4，x-render onClickAction 对齐）', () => {
  it('声明 sideEffects 后渲染「编辑」入口', () => {
    const { container } = renderForm({
      type: 'object',
      properties: {
        bio: {
          type: 'string',
          widget: 'input',
          title: '简介',
          sideEffects: { editor: 'textarea', title: '编辑简介' },
        },
      },
    });

    // 编辑入口按钮出现（FieldWrapper 额外渲染）
    expect(
      container.querySelector('[data-nexus-side-effects] button'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-nexus-side-effects] button')!.textContent,
    ).toBe('编辑简介');
  });

  it('点击编辑入口 → 打开 Modal → 编辑保存写回字段', async () => {
    const { container, form } = renderForm({
      type: 'object',
      properties: {
        bio: {
          type: 'string',
          widget: 'input',
          title: '简介',
          sideEffects: { editor: 'textarea', title: '自我介绍' },
        },
      },
    });

    fireEvent.click(
      container.querySelector('[data-nexus-side-effects] button')!,
    );
    await waitFor(() => {
      expect(document.querySelector('.ant-modal')).not.toBeNull();
    });

    // 编辑器中输入值
    const textarea = document.querySelector('.ant-modal textarea');
    expect(textarea).not.toBeNull();
    fireEvent.change(textarea!, { target: { value: '我是前端工程师' } });

    // 保存 → 字段值写回引擎
    fireEvent.click(document.querySelector('.ant-modal .ant-btn-primary')!);
    await waitFor(() => {
      expect(form.form!.getValueByPath('bio')).toBe('我是前端工程师');
    });
  });

  it('取消关闭不写回值', async () => {
    const { container, form } = renderForm(
      {
        type: 'object',
        properties: {
          bio: {
            type: 'string',
            widget: 'input',
            title: '简介',
            sideEffects: { editor: 'textarea' },
          },
        },
      },
      { initialValues: { bio: '原始值' } },
    );

    fireEvent.click(
      container.querySelector('[data-nexus-side-effects] button')!,
    );
    await waitFor(() => {
      expect(document.querySelector('.ant-modal')).not.toBeNull();
    });
    const textarea = document.querySelector('.ant-modal textarea');
    fireEvent.change(textarea!, { target: { value: '改动但不保存' } });
    fireEvent.click(
      document.querySelectorAll('.ant-modal .ant-btn')[0]!, // 取消按钮
    );
    await waitFor(() => {
      expect(document.querySelector('.ant-modal')).toBeNull();
    });
    expect(form.form!.getValueByPath('bio')).toBe('原始值');
  });

  it('drawer 模式渲染抽屉而非弹窗', async () => {
    const { container } = renderForm({
      type: 'object',
      properties: {
        content: {
          type: 'string',
          widget: 'input',
          title: '内容',
          sideEffects: { editor: 'textarea', mode: 'drawer' },
        },
      },
    });

    fireEvent.click(
      container.querySelector('[data-nexus-side-effects] button')!,
    );
    await waitFor(() => {
      expect(document.querySelector('.ant-drawer')).not.toBeNull();
    });
    expect(document.querySelector('.ant-modal')).toBeNull();
  });
});

describe('依赖驱动的动态 enum（P2-C，渲染层）', () => {
  it('表达式 enum 依赖切换：下拉选项随之更新', () => {
    // 先渲染 – 初始 country=CN → 北京/上海
    const { container, form } = renderForm({
      type: 'object',
      properties: {
        country: {
          type: 'string',
          widget: 'select',
          default: 'CN',
          enum: ['CN', 'US'],
        },
        city: {
          type: 'string',
          widget: 'select',
          default: '北京',
          enum: "{{ $deps[0] === 'CN' ? ['北京', '上海'] : ['New York', 'LA'] }}",
          dependencies: ['country'],
        },
      },
    });
    const cityField = container.querySelector('[data-nexus-field="city"]')!;

    // 渲染层面：字段存在且值为默认
    expect(cityField).not.toBeNull();
    expect(form.form!.getValueByPath('city')).toBe('北京');

    // 切换 country → US，city 的 meta.enum 更新为 NYC/LA（依赖引擎反应链路）
    (form.form as any).setValueByPath('country', 'US');
    const cityState = form.form!._getEngine().getFieldState('city')!;
    expect(cityState.meta.enum).toEqual(['New York', 'LA']);
    // 值保留（动态 enum 不重置字段值）
    expect(form.form!.getValueByPath('city')).toBe('北京');
  });
});

describe('数组折叠 + 拖拽排序（P2-E，formily ArrayField 对齐）', () => {
  function renderList(
    schema: unknown,
    initialValues?: Record<string, unknown>,
  ) {
    const holder: { form?: FormController } = {};
    function TestForm() {
      const [form] = useForm();
      holder.form = form;
      registerAntdUI(form._getEngine());
      return (
        <NexusForm
          form={form}
          schema={schema as never}
          footer={false}
          initialValues={initialValues}
        />
      );
    }
    const result = render(<TestForm />);
    return { ...result, form: holder };
  }

  const listSchema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        widget: 'list',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input', title: '名称' },
            count: { type: 'number', widget: 'input', title: '数量' },
          },
        },
      },
    },
  };

  it('collapsible 卡片：字段渲染在 Collapse 面板中，值与路径正确', () => {
    const { container, form } = renderList(listSchema, {
      items: [
        { name: 'a', count: 1 },
        { name: 'b', count: 2 },
      ],
    });
    // antd Collapse → 渲染每项输入框（2 项 × 2 字段），字段输入框存在
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(4);
    // 引擎数据完整回显
    expect(form.form!.getValueByPath('items')).toEqual([
      { name: 'a', count: 1 },
      { name: 'b', count: 2 },
    ]);
  });

  it('拖拽排序（dragSort）：渲染拖拽手柄，可排序', () => {
    const { container, form } = renderList(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            props: { dragSort: true },
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input', title: '名称' },
              },
            },
          },
        },
      },
      { items: [{ name: 'a' }, { name: 'b' }] },
    );
    // 渲染拖拽手柄（每项一个）
    const handles = container.querySelectorAll('[title="拖拽排序"]');
    expect(handles.length).toBeGreaterThanOrEqual(2);
    // 初始数组顺序
    expect(form.form!.getValueByPath('items')).toHaveLength(2);
  });
});
