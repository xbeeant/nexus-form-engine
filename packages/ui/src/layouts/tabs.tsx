import { Tabs } from 'antd';
import { useState } from 'react';

export const tabsLayout = ({ node, children }: any) => {
  const panes = node?.children ?? [];
  const [active, setActive] = useState('0');
  return (
    <Tabs
      activeKey={active}
      onChange={setActive}
      style={{ marginBottom: 16 }}
      items={panes.map((pane: any, i: number) => ({
        key: String(i),
        label: pane.title || `Tab ${i + 1}`,
        children: children[i],
      }))}
    />
  );
};
