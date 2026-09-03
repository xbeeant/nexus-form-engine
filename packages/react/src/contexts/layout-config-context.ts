import { createContext } from 'react';

export interface LayoutConfigContextValue {
  removeHidden?: boolean;
}
export const LayoutConfigContext = createContext<LayoutConfigContextValue>({});
