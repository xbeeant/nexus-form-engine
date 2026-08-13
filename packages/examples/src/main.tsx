import dayjs from 'dayjs';
import { createRoot } from 'react-dom/client';
import 'dayjs/locale/zh-cn';
import './index.css';

import App from './App.tsx';

dayjs.locale('zh-cn');

createRoot(document.getElementById('root')!).render(<App />);
