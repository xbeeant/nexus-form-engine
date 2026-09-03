import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Modal } from 'antd';
import type { ButtonType } from 'antd/es/button/buttonHelpers';
import { useEffect, useState } from 'react';
import { articleSchema } from '../modal-page';

const ModalForm = ({ visible, value, onCancel }) => {
  const [formController] = useForm();
  const [form2] = useForm();

  // 注册 antd UI + richText widget（每个引擎独立注册）
  useEffect(() => {
    const engineA = formController._getEngine();
    registerAntdUI(engineA);

    formController.setValues(value);

    const engineB = form2._getEngine();
    registerAntdUI(engineB);

    form2.setValues(value);
  }, [formController, form2]);

  return (
    <Modal
      title='文章编辑'
      open={visible}
      onCancel={() => onCancel()}
      footer={[
        <Button key='close' onClick={() => onCancel}>
          关闭
        </Button>,
      ]}
      width={1024}
    >
      {value && (
        // 使用同一 shareSchema + readOnly 渲染详情（richText widget 也一致）
        <div className='flex flex-row'>
          <NexusForm form={form2} schema={articleSchema} />
          <NexusForm form={formController} schema={articleSchema} />
        </div>
      )}
    </Modal>
  );
};
const EditModal = ({
  record,
  type = 'link',
}: {
  record: Record<string, any>;
  type?: ButtonType;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Button type={type} size='small' onClick={() => setVisible(true)}>
        编辑
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

export default EditModal;
