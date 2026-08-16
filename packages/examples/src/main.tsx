import dayjs from 'dayjs';
import { RootProvider } from 'fumadocs-ui/provider/base';
import { createRoot } from 'react-dom/client';
import 'dayjs/locale/zh-cn';
import './index.css';

import App from './App.tsx';
import { DocsFrameworkProvider } from './lib/router';

dayjs.locale('zh-cn');

createRoot(document.getElementById('root')!).render(
  <DocsFrameworkProvider>
    <RootProvider>
      <App />
    </RootProvider>
  </DocsFrameworkProvider>,
);
