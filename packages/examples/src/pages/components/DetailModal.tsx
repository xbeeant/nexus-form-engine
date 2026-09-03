import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { articleSchema } from '../ModalPage';
import EditModal from './EditModal.tsx';

const ModalForm = ({ visible, value, onCancel }) => {
  const [detailForm] = useForm();

  // 注册 antd UI + richText widget（每个引擎独立注册）
  useEffect(() => {
    const engineA = detailForm._getEngine();
    registerAntdUI(engineA);
    detailForm.setValues(value);
  }, [detailForm]);

  return (
    <Modal
      title='文章详情'
      open={visible}
      onCancel={() => onCancel()}
      footer={[
        <EditModal type='default' record={value} />,
        <Button key='close' onClick={() => onCancel}>
          关闭
        </Button>,
      ]}
      width='600px'
    >
      {value && (
        // 使用同一 shareSchema + readOnly 渲染详情（richText widget 也一致）
        <NexusForm form={detailForm} schema={articleSchema} readOnly />
      )}
    </Modal>
  );
};
const DetailModal = ({ record }: { record: Record<string, any> }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Button type='link' size='small' onClick={() => setVisible(true)}>
        详情
      </Button>

      {visible && (
        <ModalForm
          value={record}
          visible={visible}
          onCancel={() => setVisible(false)}
        />
      )}
    </div>
  );
};

export default DetailModal;
