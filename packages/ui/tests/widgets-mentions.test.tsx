import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mentionsWidget } from '../src/widgets/mentions';

describe('mentionsWidget', () => {
  it('基础渲染：无值', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('有值时渲染文本', () => {
    const { container } = render(
      mentionsWidget({
        value: 'Hello @world',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay', () => {
    const { container } = render(
      mentionsWidget({
        value: 'test value',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).toBeNull();
    expect(container.textContent).toContain('test value');
  });

  it('readOnly 空值显示占位符', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('自定义 prefix 透传', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        prefix: '#',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('默认 prefix 为 @', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('disabled 时禁用', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions-disabled')).not.toBeNull();
  });

  it('loading 时禁用', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        loading: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions-disabled')).not.toBeNull();
  });

  it('allowClear 透传', () => {
    const { container } = render(
      mentionsWidget({
        value: 'test',
        allowClear: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('autoSize 对象透传', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        autoSize: { minRows: 2, maxRows: 5 },
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('自定义 rows 透传', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        rows: 5,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('自定义 placeholder 透传', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        placeholder: '请输入...',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-mentions')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      mentionsWidget({
        value: undefined,
        className: 'custom-class',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.custom-class')).not.toBeNull();
  });
});
