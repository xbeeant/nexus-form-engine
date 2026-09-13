import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { textAreaWidget } from '../src/widgets/textarea';

describe('textAreaWidget', () => {
  it('渲染 antd Input.TextArea 控件', () => {
    const { container } = render(
      textAreaWidget({
        value: 'hello',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('回显 value 到 textarea', () => {
    const { container } = render(
      textAreaWidget({
        value: 'multi\nline\nvalue',
        onChange: () => {},
      } as never),
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('multi\nline\nvalue');
  });

  it('空值渲染空字符串', () => {
    const { container } = render(
      textAreaWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('onChange 写入新值', () => {
    const onChange = vi.fn();
    const { container } = render(
      textAreaWidget({
        value: '',
        onChange,
      } as never),
    );
    fireEvent.change(container.querySelector('textarea')!, {
      target: { value: 'new text' },
    });
    expect(onChange).toHaveBeenCalledWith('new text');
  });

  it('rows 属性透传', () => {
    const { container } = render(
      textAreaWidget({
        value: 'test',
        rows: 5,
        onChange: () => {},
      } as never),
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.rows).toBe(5);
  });

  it('disabled 时 textarea 禁用', () => {
    const { container } = render(
      textAreaWidget({
        value: 'test',
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('readOnly 时渲染 ReadOnlyDisplay 文本', () => {
    const { container } = render(
      textAreaWidget({
        value: 'readonly content',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.textContent).toBe('readonly content');
  });

  it('autoSize 透传', () => {
    const { container } = render(
      textAreaWidget({
        value: 'test',
        autoSize: { minRows: 2, maxRows: 10 },
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('minRows/maxRows 合并为 autoSize 对象', () => {
    const { container } = render(
      textAreaWidget({
        value: 'test',
        minRows: 3,
        maxRows: 8,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('placeholder 透传给 TextArea', () => {
    const { container } = render(
      textAreaWidget({
        value: '',
        placeholder: '请输入描述',
        onChange: () => {},
      } as never),
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('请输入描述');
  });

  it('loading 时 disabled', () => {
    const { container } = render(
      textAreaWidget({
        value: 'test',
        loading: true,
        onChange: () => {},
      } as never),
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('透传 rest props', () => {
    const { container } = render(
      textAreaWidget({
        value: 'test',
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea.my-custom-class',
    );
    expect(textarea).not.toBeNull();
  });
});
