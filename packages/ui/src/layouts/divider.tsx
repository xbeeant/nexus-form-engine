import { Divider } from 'antd';

export const dividerLayout = ({ title }: { title?: string }) => (
  <Divider
    titlePlacement={title ? 'left' : undefined}
    style={{ margin: '16px 0' }}
  >
    {title}
  </Divider>
);
