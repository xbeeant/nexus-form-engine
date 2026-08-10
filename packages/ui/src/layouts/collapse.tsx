import { Collapse } from 'antd';

export const collapseLayout = ({ node, children, ...props }: any) => {
  const panels = node?.children ?? [];
  // 支持从 schema 节点 props 传入 defaultActiveKey，未指定时默认展开第一个
  const defaultActiveKey = props.defaultActiveKey ?? ['0'];

  return (
    <Collapse
      defaultActiveKey={defaultActiveKey}
      style={{ marginBottom: 16 }}
      items={panels.map((panel: any, i: number) => ({
        key: String(i),
        label: panel.title || `面板 ${i + 1}`,
        children: children[i],
        ...panel.props,
      }))}
    />
  );
};
