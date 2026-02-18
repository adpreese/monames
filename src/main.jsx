import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
const routerBase = import.meta.env.BASE_URL;

root.render(
  <BrowserRouter basename={routerBase}>
      <App />
  </BrowserRouter>
);
