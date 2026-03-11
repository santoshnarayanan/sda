// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Provider } from 'react-redux'; // Import Provider
import { store } from './redux/store'; // Import your store

/*
    * The main entry point of the React application.
        * This file renders the App component and wraps it with the Redux Provider to make the store available throughout the app.
        * Example usage:
        * ReactDOM.createRoot(document.getElementById('root')!).render(
        *   <React.StrictMode>
        *     <Provider store={store}>
        *       <App />
        *     </Provider>
        *   </React.StrictMode>,
        * );
*/
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* Wrap App with the Provider component */}
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>,
)