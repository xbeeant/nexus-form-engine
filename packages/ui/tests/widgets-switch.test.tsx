import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { switchWidget } from '../src/widgets/switch';

describe('switchWidget', () => {
  it('渲染 antd Switch 控件', () => {
    const { container } = render(
      switchWidget({
        value: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-switch')).not.toBeNull();
  });

  it('value=true 时开关选中', () => {
    const { container } = render(
      switchWidget({
        value: true,
        onChange: () => {},
      } as never),
    );
    const sw = container.querySelector('.ant-switch');
    expect(sw?.classList.contains('ant-switch-checked')).toBe(true);
  });

  it('value=false 时开关未选中', () => {
    const { container } = render(
      switchWidget({
        value: false,
        onChange: () => {},
      } as never),
    );
    const sw = container.querySelector('.ant-switch');
    expect(sw?.classList.contains('ant-switch-checked')).toBe(false);
  });

  it('value=1 时开关选中', () => {
    const { container } = render(
      switchWidget({
        value: 1,
        onChange: () => {},
      } as never),
    );
    const sw = container.querySelector('.ant-switch');
    expect(sw?.classList.contains('ant-switch-checked')).toBe(true);
  });

  it('value="true" 时开关选中', () => {
    const { container } = render(
      switchWidget({
        value: 'true',
        onChange: () => {},
      } as never),
    );
    const sw = container.querySelector('.ant-switch');
    expect(sw?.classList.contains('ant-switch-checked')).toBe(true);
  });

  it('value="1" 时开关选中', () => {
    const { container } = render(
      switchWidget({
        value: '1',
        onChange: () => {},
      } as never),
    );
    const sw = container.querySelector('.ant-switch');
    expect(sw?.classList.contains('ant-switch-checked')).toBe(true);
  });

  it('options 自定义 checked/unchecked 文案', () => {
    const { container } = render(
      switchWidget({
        value: true,
        options: [
          { label: '开', value: 'true' },
          { label: '关', value: 'false' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('开');
    expect(container.textContent).toContain('关');
  });

  it('disabled 时开关禁用', () => {
    const { container } = render(
      switchWidget({
        value: true,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const sw = container.querySelector('.ant-switch');
    expect(sw?.classList.contains('ant-switch-disabled')).toBe(true);
  });

  it('loading 时开关禁用', () => {
    const { container } = render(
      switchWidget({
        value: true,
        loading: true,
        onChange: () => {},
      } as never),
    );
    const sw = container.querySelector('.ant-switch');
    expect(sw?.classList.contains('ant-switch-disabled')).toBe(true);
  });

  it('readOnly 时渲染 ReadOnlyDisplay 显示是/否', () => {
    const { container } = render(
      switchWidget({
        value: true,
        options: [
          { label: '启用', value: 1 },
          { label: '禁用', value: 0 },
        ],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-switch')).toBeNull();
    // boolean 值在 ReadOnlyDisplay 中优先走 isPrimitive → 返回 是/否
    expect(container.textContent).toBe('是');
  });

  it('readOnly 时 value=true 渲染 是', () => {
    const { container } = render(
      switchWidget({
        value: true,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('是');
  });

  it('readOnly 时 value=false 渲染 否', () => {
    const { container } = render(
      switchWidget({
        value: false,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('否');
  });

  it('透传 rest props', () => {
    const { container } = render(
      switchWidget({
        value: true,
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const sw = container.querySelector('.ant-switch.my-custom-class');
    expect(sw).not.toBeNull();
  });
});
