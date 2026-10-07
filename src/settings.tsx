import { createRoot } from 'react-dom/client';
import './settings.css';
import './mascot.css';
import SettingsApp from './components/settings/SettingsApp';

createRoot(document.getElementById('root') as HTMLElement).render(<SettingsApp />);
