import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

async function init() {
  // In Electron: load saved data from file into localStorage, then
  // patch localStorage.setItem/removeItem to sync changes back to file.
  if (window.electronStorage) {
    const data = await window.electronStorage.getAll();
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, value);
    }

    const origSetItem = localStorage.setItem.bind(localStorage);
    const origRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = (key, value) => {
      origSetItem(key, value);
      window.electronStorage.setItem(key, value);
    };

    localStorage.removeItem = (key) => {
      origRemoveItem(key);
      window.electronStorage.removeItem(key);
    };
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

init();
