import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { bootstrapAppData } from './bootstrap';
import { updateService } from './services/update/UpdateService';

// PWA 更新検知/SW 登録の土台を起動。
updateService.init();

// 初期データ（共有カレンダー ensure + モック予定 seed）。
void bootstrapAppData();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
