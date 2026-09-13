import { render } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { autoCompleteWidget } from '../src';

async function renderAutoComplete(props: never) {
  const result = render(autoCompleteWidget(props));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  return result;
}

describe('autoCompleteWidget', () => {
  it('基础渲染：无值', async () => {
    const { container } = await renderAutoComplete({
      value: undefined,
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('单值渲染为数组', async () => {
    const { container } = await renderAutoComplete({
      value: 'test',
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('多值渲染为数组', async () => {
    const { container } = await renderAutoComplete({
      value: ['a', 'b'],
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay', async () => {
    const { container } = await renderAutoComplete({
      value: ['a', 'b'],
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      readOnly: true,
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select')).toBeNull();
    expect(container.textContent).toContain('A');
  });

  it('readOnly 空值显示占位符', async () => {
    const { container } = await renderAutoComplete({
      value: undefined,
      readOnly: true,
      onChange: () => {},
    } as never);
    expect(container.textContent).toBe('-');
  });

  it('disabled 时禁用', async () => {
    const { container } = await renderAutoComplete({
      value: undefined,
      disabled: true,
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select-disabled')).not.toBeNull();
  });

  it('loading 时禁用', async () => {
    const { container } = await renderAutoComplete({
      value: undefined,
      loading: true,
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select-disabled')).not.toBeNull();
  });

  it('自定义 allowClear 透传', async () => {
    const { container } = await renderAutoComplete({
      value: undefined,
      allowClear: false,
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('自定义 defaultActiveFirstOption 透传', async () => {
    const { container } = await renderAutoComplete({
      value: undefined,
      defaultActiveFirstOption: true,
      onChange: () => {},
    } as never);
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('透传 rest props', async () => {
    const { container } = await renderAutoComplete({
      value: undefined,
      className: 'custom-class',
      onChange: () => {},
    } as never);
    expect(container.querySelector('.custom-class')).not.toBeNull();
  });
});
