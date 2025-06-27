import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider }  from '@tonconnect/ui-react';
import './index.css'; 

// Your original manifest logic is correct.
const manifestUrl = new URL('tonconnect-manifest.json', window.location.origin).toString();

// Your original bot username is correct.
const telegramBotUsername = 'arix_terminal_tma_bot'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      actionsConfiguration={{
         twaReturnUrl: `https://t.me/${telegramBotUsername}/start`
      }}
    >
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>,
);
