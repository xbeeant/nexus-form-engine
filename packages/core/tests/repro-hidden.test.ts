import { describe, it, expect } from 'vitest';
import { NexusEngine } from '../src';

describe('hidden expression repro', () => {
  const schema: any = {
    type: 'object',
    properties: {
      message_management_instance_title: {
        title: '流程标题',
        type: 'string',
        widget: 'input',
        readOnly: true,
      },
      multi_c_standard_approval_result: {
        title: '是否同意',
        type: 'string',
        enum: ['1', '0'],
        enumNames: ['同意', '不同意'],
        widget: 'radio',
        required: '1',
      },
      c_standard_multi_task_comment: {
        title: '审批意见',
        type: 'string',
        widget: 'textArea',
        hidden: '',
      },
      message_management_external_assessment_reviewer: {
        title: '需求域外评审人',
        type: 'any',
        widget: 'user',
        required: '1',
        hidden: "{{formData.multi_c_standard_approval_result!== '1'}}",
        props: { mode: 'multiple', placeholder: '请选择用户' },
        extra: '请选择副总师和总师审核',
      },
    },
  };

  it('reproduces', () => {
    const engine = new NexusEngine();
    engine.init(schema);

    const external = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(external.visible, 'init visible (approval undefined)').toBe(false);
    expect(
      external.reactions?.some((r: any) => r._autoExpr),
      'has autoExpr reaction',
    ).toBe(true);

    engine.setFieldValue('multi_c_standard_approval_result', '0');
    const externalAfter = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(externalAfter.visible, 'after 0 (should be hidden)').toBe(false);

    engine.setFieldValue('multi_c_standard_approval_result', '1');
    const externalAfter1 = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(externalAfter1.visible, 'after 1 (should be visible)').toBe(true);
  });

  it('setValues loads data and triggers reactions', () => {
    const engine = new NexusEngine();
    engine.init(schema);
    engine.setFieldValues({
      multi_c_standard_approval_result: '1',
    });
    const external = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(external.visible, 'setValues approval=1').toBe(true);
  });

  it('full real schema with init value', () => {
    const fullSchema: any = {
      type: 'object',
      properties: {
        message_management_instance_title: { title: '流程标题', type: 'string', widget: 'input', readOnly: true },
        multi_c_standard_approval_result: {
          title: '是否同意', type: 'string', enum: ['1', '0'], enumNames: ['同意', '不同意'], widget: 'radio', required: '1',
          other: { tableOrder: 0 },
        },
        c_standard_multi_task_comment: {
          title: '审批意见', type: 'string', widget: 'textArea', required: '1', hidden: '',
        },
        message_management_external_assessment_reviewer: {
          title: '需求域外评审人', type: 'any', widget: 'user', required: '1',
          hidden: "{{formData.multi_c_standard_approval_result!== '1'}}",
          props: { mode: 'multiple', placeholder: '请选择用户' },
          extra: '请选择副总师和总师审核',
        },
      },
    };
    const engine = new NexusEngine();
    engine.init(fullSchema, { multi_c_standard_approval_result: '1' });
    const external = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(external.visible, 'init approval=1').toBe(true);
    engine.setFieldValue('multi_c_standard_approval_result', '0');
    const externalAfter = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(externalAfter.visible, 'after approval=0').toBe(false);
  });
});
