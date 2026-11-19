import './styles/fonts.css';
import './styles/tokens.css';
import './styles/assets.css';
import './styles/components.css';
import './styles/scene.css';
import { start } from './ui/router.js';

const app = document.getElementById('app');
start((route) => {
  app.textContent = route.name;
});
