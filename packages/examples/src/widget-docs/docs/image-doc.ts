// ============================================================================
// image-doc — 图片上传组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const imageDoc: WidgetDoc = {
  id: 'image',
  group: '文件图片',
  title: '图片上传',
  english: 'ImageUpload',
  description:
    '图片上传组件。支持多图（multiple）、数量限制（maxCount）、文件夹上传（directory）、上传列表开关（showUploadList）与图片卡片展示。',
  demos: [
    {
      title: '基础用法',
      description:
        'multiple + maxCount 支持多图与数量限制；accept 限定图片类型；showUploadList 控制是否展示已上传列表。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          gallery: {
            type: 'array',
            widget: 'image',
            title: '产品图集',
            props: {
              action: '/api/upload',
              multiple: true,
              maxCount: 8,
              accept: 'image/*',
            },
          },
          avatar: {
            type: 'string',
            widget: 'image',
            title: '头像（单图）',
            props: {
              action: '/api/upload',
              maxCount: 1,
              listType: 'picture-card',
            },
          },
        },
      },
    },
    {
      title: '文件夹与列表隐藏',
      description:
        'directory 允许选择整个文件夹上传；showUploadList: false 隐藏上传列表（配合自定义预览）；name 自定义上传字段名。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          assets: {
            type: 'array',
            widget: 'image',
            title: '资源文件夹',
            props: {
              action: '/api/upload',
              directory: true,
              multiple: true,
              showUploadList: false,
              name: 'asset',
            },
          },
        },
      },
    },
  ],
};
