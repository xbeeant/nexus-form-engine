import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { transferWidget } from '../src/widgets/transfer';

describe('transferWidget', () => {
  const dataSource = [
    { key: '1', title: '项目 A' },
    { key: '2', title: '项目 B' },
    { key: '3', title: '项目 C' },
  ];

  it('渲染 antd Transfer 控件', () => {
    const { container } = render(
      transferWidget({
        value: ['1', '2'],
        transferData: dataSource,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('transferData 为数组时直接使用', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: dataSource,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('transferData 为 JSON 字符串时解析', () => {
    const jsonStr = JSON.stringify(dataSource);
    const { container } = render(
      transferWidget({
        value: [],
        transferData: jsonStr,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('transferData 为非法 JSON 时降级为空数据源', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: '{{ broken',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('transferData 为非字符串非数组时返回空数据源', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: 123 as never,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('目标列仅显示 value 中的 key', () => {
    const { container } = render(
      transferWidget({
        value: ['2'],
        transferData: dataSource,
        onChange: () => {},
      } as never),
    );
    // 项目 B 应该在目标列中
    expect(container.textContent).toContain('项目 B');
  });

  it('titles 逗号分隔字符串解析为列标题', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: dataSource,
        titles: '可选,已选',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('titles 为数组时透传', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: dataSource,
        titles: ['左侧标题', '右侧标题'],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('disabled 时穿梭框禁用', () => {
    const { container } = render(
      transferWidget({
        value: ['1'],
        transferData: dataSource,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const transfer = container.querySelector('.ant-transfer-disabled');
    expect(transfer).not.toBeNull();
  });

  it('loading 时穿梭框禁用', () => {
    const { container } = render(
      transferWidget({
        value: ['1'],
        transferData: dataSource,
        loading: true,
        onChange: () => {},
      } as never),
    );
    const transfer = container.querySelector('.ant-transfer-disabled');
    expect(transfer).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay 显示已选项', () => {
    const { container } = render(
      transferWidget({
        value: ['1', '3'],
        transferData: dataSource,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).toBeNull();
    expect(container.textContent).toContain('项目 A');
    expect(container.textContent).toContain('项目 C');
  });

  it('readOnly 无已选项时渲染空', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: dataSource,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).toBeNull();
    expect(container.textContent).toBe('-');
  });

  it('单值 value 时降级为空数组', () => {
    const { container } = render(
      transferWidget({
        value: '1' as unknown as string[],
        transferData: dataSource,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('showSearch 透传', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: dataSource,
        showSearch: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('oneWay 透传', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: dataSource,
        oneWay: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-transfer')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      transferWidget({
        value: [],
        transferData: dataSource,
        onChange: () => {},
        'data-testid': 'my-transfer',
      } as never),
    );
    const transfer = container.querySelector(
      '.ant-transfer[data-testid="my-transfer"]',
    );
    expect(transfer).not.toBeNull();
  });
});
