import { Transfer } from 'antd';
import type { TransferItem, TransferProps } from 'antd/es/transfer';
import type { ReactNode } from 'react';
import {
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export interface TransferDataSourceItem extends TransferItem {
  title?: string;
}

/** 解析 JSON 字符串 / 对象数组 → Transfer 数据源 */
function parseDataSource(
  raw: unknown,
): TransferDataSourceItem[] {
  if (Array.isArray(raw)) {
    return raw as TransferDataSourceItem[];
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as TransferDataSourceItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export const transferWidget = withFormItem(
  ({
    value,
    onChange,
    title,
    description,
    disabled,
    loading,
    readOnly,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    transferData,
    showSearch,
    titles,
    oneWay,
    ...rest
  }: WidgetProps & {
  transferData?: unknown;
  titles?: string | string[];
}) => {
    const dataSource = parseDataSource(transferData);
    const targetKeys = (Array.isArray(value) ? value : []) as string[];

    if (readOnly) {
      const selected = dataSource
        .filter((d) => targetKeys.includes(String(d.key)))
        .map((d) => d.title ?? String(d.key));
      return <ReadOnlyDisplay value={selected} />;
    }

    const render = (item: TransferDataSourceItem): ReactNode =>
      item.title ?? String(item.key);

    // 列标题：字符串（逗号分隔）→ 二元组
    let renderTitles: [ReactNode, ReactNode] | undefined;
    if (Array.isArray(titles)) {
      renderTitles = titles as unknown as [ReactNode, ReactNode];
    } else if (typeof titles === 'string' && titles.trim()) {
      const parts = titles
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      renderTitles = [parts[0], parts[1]] as [ReactNode, ReactNode];
    }

    return (
      <Transfer
        dataSource={dataSource}
        targetKeys={targetKeys}
        onChange={(keys) => onChange(keys as string[])}
        render={render as unknown as TransferProps<TransferDataSourceItem>['render']}
        titles={renderTitles}
        showSearch={showSearch as boolean}
        oneWay={oneWay as boolean}
        disabled={disabled || loading}
        {...rest}
      />
    );
  },
);
