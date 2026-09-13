import { describe, expect, it } from 'vitest';
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
    expect(external.hidden, 'init visible (approval undefined)').toBe(true);
    expect(
      external.reactions?.some((r: any) => r._autoExpr),
      'has autoExpr reaction',
    ).toBe(true);

    engine.setFieldValue('multi_c_standard_approval_result', '0');
    const externalAfter = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(externalAfter.hidden, 'after 0 (should be hidden)').toBe(true);

    engine.setFieldValue('multi_c_standard_approval_result', '1');
    const externalAfter1 = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(externalAfter1.hidden, 'after 1 (should be visible)').toBe(false);
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
    expect(external.hidden, 'setValues approval=1').toBe(false);
  });

  it('full real schema with init value', () => {
    const fullSchema: any = {
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
          other: { tableOrder: 0 },
        },
        c_standard_multi_task_comment: {
          title: '审批意见',
          type: 'string',
          widget: 'textArea',
          required: '1',
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
    const engine = new NexusEngine();
    engine.init(fullSchema, { multi_c_standard_approval_result: '1' });
    const external = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(external.hidden, 'init approval=1').toBe(false);
    engine.setFieldValue('multi_c_standard_approval_result', '0');
    const externalAfter = engine.getFieldState(
      'message_management_external_assessment_reviewer',
    )!;
    expect(externalAfter.hidden, 'after approval=0').toBe(true);
  });
});

describe('hidden expression on layout container (core)', () => {
  it('registers containerOnly state and toggles via _autoExpr reaction', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        show: { type: 'boolean', widget: 'radio', enum: ['1', '0'] },
        cardArea: {
          type: 'card',
          title: '卡片区域',
          hidden: "{{formData.show === '1'}}",
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
      },
    });

    // 布局节点 Key 不进入数据路径，但挂 containerOnly 合成状态（hidden 订阅）
    const state = engine.getFieldState('cardArea') as any;
    expect(state, 'cardArea 合成状态存在').toBeDefined();
    expect(state.path).toBe('cardArea');
    expect(state.meta.containerOnly).toBe(true);
    expect(state.value, 'container 不持值').toBeUndefined();
    expect(state.hidden, 'init hidden (show undefined)').toBe(false);

    // 布局 key 不进入 formData
    expect(Object.keys(engine.getFormData())).not.toContain('cardArea');
    expect(Object.keys(engine.getFormData())).not.toContain('cardArea.name');

    // show = '1' → 联动求值 hidden → true
    engine.setFieldValue('show', '1');
    const after = engine.getFieldState('cardArea') as any;
    expect(after.hidden, 'after show=1').toBe(true);
    expect(
      after.reactions?.some((r: any) => r._autoExpr),
      'layout container 有 _autoExpr reaction',
    ).toBe(true);

    // show = '0' → hidden → false
    engine.setFieldValue('show', '0');
    expect((engine.getFieldState('cardArea') as any).hidden).toBe(false);

    // 容器状态订阅可触发（渲染器经 dataPath 订阅生产-消费同路径）
    let hiddenAtNotify: any = 'unset';
    const off = engine.subscribeField('cardArea', () => {
      hiddenAtNotify = engine.getFieldState('cardArea')?.hidden;
    });
    engine.setFieldValue('show', '1');
    expect(hiddenAtNotify).toBe(true);
    off();
  });
});
