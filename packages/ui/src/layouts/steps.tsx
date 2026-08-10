import { Button, Space, Steps } from 'antd';
import { useState } from 'react';

export const stepsLayout = ({ node, children }: any) => {
  const steps = node?.children ?? [];
  const [active, setActive] = useState(0);
  return (
    <div style={{ marginBottom: 16 }}>
      <Steps
        current={active}
        items={steps.map((s: any) => ({
          title: s.title || '步骤',
        }))}
      />
      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: '1px solid #f0f0f0',
          borderRadius: 6,
        }}
      >
        {children[active]}
      </div>
      <Space style={{ marginTop: 8 }}>
        <Button disabled={active === 0} onClick={() => setActive((a) => a - 1)}>
          上一步
        </Button>
        <Button
          type='primary'
          disabled={active === steps.length - 1}
          onClick={() => setActive((a) => a + 1)}
        >
          下一步
        </Button>
      </Space>
    </div>
  );
};
