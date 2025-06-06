
import React from 'react';
import { HashRouter } from 'react-router-dom';
import AppRoutes from './navigation';
import { useAppStore } from './store/useAppStore';
import { useTranslation } from './i18n';

const App: React.FC = () => {
  const { language } = useAppStore();
  const { setLanguage } = useTranslation();

  React.useEffect(() => {
    setLanguage(language);
  }, [language, setLanguage]);

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <AppRoutes />
      </div>
    </HashRouter>
  );
};

export default App;
