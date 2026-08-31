import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Provider } from 'react-redux';
import store from './redux/store.ts';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
// KaTeX styles come from the npm package so Vite bundles the CSS and emits the
// font files it references. Do not re-add a hand-vendored copy under public/.
import 'katex/dist/katex.min.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
