/**
 * 从 type / format 推断 widget 名（对齐 x-render）
 * - type: number/integer → number
 * - type: boolean → switch
 * - type: string + format: date → date
 * - type: string + format: textarea → textarea
 * - type: string（默认）→ input
 */
export function inferWidget(field: {
  type?: string;
  format?: string;
  widget?: string;
}): string {
  if (field.widget) {
    return field.widget;
  }
  switch (field.type) {
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'switch';
    default:
      if (field.format === 'date' || field.format === 'date-time') {
        return 'date';
      }
      if (field.format === 'textarea') {
        return 'textarea';
      }
      return 'input';
  }
}
