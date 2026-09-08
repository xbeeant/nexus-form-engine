/**
 * 回归测试：模态框套模态框（detail readOnly + edit 可编辑）共用同一 form
 *
 * 背景：多实例提交（5cd58ed）后，弹出的模态框中再弹一个模态框会卡死/OOM。
 * 根因：_acquireInstanceId 在 useMemo 中调用，有副作用（递增计数器、依赖 views.size），
 *   - StrictMode 下 useMemo 双调用，第二次返回不同 ID
 *   - React 内存压力下可能丢弃 useMemo 缓存 → 重新执行 → 新 ID → engine 引用变化
 *     → init effect 重跑 → bump() → 重渲染 → 再丢缓存 → 渲染循环 OOM
 * 修复：改用 useRef + lazy init，保证整个生命周期只分配一次实例 ID。
 */

import { cleanup, fireEvent, render } from '@testing-library/react';
import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

const holder: { form?: FormController } = {};

function StubInput(props: any) {
  renderCount.input++;
  return (
    <input
      data-testid={`input-${props.path}`}
      value={props.value ?? ''}
      readOnly={props.readOnly}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}
const renderCount = { input: 0 };

const productSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', widget: 'input' },
    price: { type: 'number', widget: 'input' },
  },
};

/**
 * 用户场景：详情模态框 readOnly=true → 点击编辑弹出编辑模态框 readOnly=false
 * 全部共用同一个 form（const [form] = useForm()）
 */
function DetailWithEditModal() {
  const [form] = useForm();
  if (!holder.form) {
    holder.form = form;
  }
  const [editOpen, setEditOpen] = React.useState(false);
  return (
    <>
      <div data-testid='detail-modal'>
        <NexusForm
          form={form}
          schema={productSchema as never}
          footer={false}
          readOnly
          widgets={{ input: StubInput }}
        />
        <button type='button' onClick={() => setEditOpen(true)}>
          edit
        </button>
      </div>
      {editOpen ? (
        <div data-testid='edit-modal'>
          <NexusForm
            form={form}
            schema={productSchema as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </div>
      ) : null}
    </>
  );
}

describe('回归：detail(readOnly) + edit 模态框共用 form', () => {
  beforeEach(() => {
    renderCount.input = 0;
    holder.form = undefined;
  });
  afterEach(() => {
    cleanup();
  });

  it('StrictMode 下打开编辑模态框不卡死', () => {
    const { container } = render(
      <StrictMode>
        <DetailWithEditModal />
      </StrictMode>,
    );

    expect(
      container.querySelector('input[data-testid="input-name"]'),
    ).not.toBeNull();

    fireEvent.click(container.querySelector('button')!);

    const inputs = container.querySelectorAll(
      'input[data-testid="input-name"]',
    );
    expect(inputs.length).toBe(2);
  });

  it('每个 NexusForm 分配独立实例（detail 只读，edit 可编辑）', () => {
    const { container } = render(
      <StrictMode>
        <DetailWithEditModal />
      </StrictMode>,
    );

    // detail 实例 readOnly：输入控件标记为只读
    const detailInputs = container.querySelectorAll(
      '[data-testid="detail-modal"] input',
    );
    expect(detailInputs.length).toBe(2);
    for (const el of Array.from(detailInputs)) {
      expect(el.hasAttribute('readonly')).toBe(true);
    }

    fireEvent.click(container.querySelector('button')!);

    const editInputs = container.querySelectorAll(
      '[data-testid="edit-modal"] input',
    );
    expect(editInputs.length).toBe(2);
  });

  it('渲染次数在合理范围（无无限循环）', () => {
    const { container } = render(
      <StrictMode>
        <DetailWithEditModal />
      </StrictMode>,
    );

    const rendersAfterDetail = renderCount.input;

    fireEvent.click(container.querySelector('button')!);

    const rendersAfterEdit = renderCount.input;
    const editRenders = rendersAfterEdit - rendersAfterDetail;

    // 编辑模态框 2 字段 × (StrictMode 2x + init 重渲染) ≈ < 10
    // 若有无限循环，这里会是数千次
    expect(editRenders).toBeLessThan(50);
  });

  it('detail 与 edit 实例数据独立', () => {
    const { container } = render(
      <StrictMode>
        <DetailWithEditModal />
      </StrictMode>,
    );

    fireEvent.click(container.querySelector('button')!);

    expect(holder.form!.getValues()).toEqual({ name: '', price: undefined });

    // 在 edit 的 input 中输入不影响 detail（两个实例各自独立视图）
    const editInputs = container.querySelectorAll(
      'input[data-testid="input-name"]',
    );
    fireEvent.change(editInputs[1], { target: { value: '编辑' } });

    const afterEdit = container.querySelectorAll(
      'input[data-testid="input-name"]',
    );
    expect((afterEdit[0] as HTMLInputElement).value).toBe('');
    expect((afterEdit[1] as HTMLInputElement).value).toBe('编辑');
  });
});
