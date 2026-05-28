import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function TelegramBackButtonSync() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const webApp = (window as any).Telegram?.WebApp;
    if (!webApp || !webApp.BackButton) return;

    // Define routes that shouldn't show the back button (main tab items/roots)
    const mainRoutes = ['/', '/feed', '/launch', '/portfolio', '/settings', '/invite', '/bounty', '/copilot', '/onramp'];
    const isMainRoute = mainRoutes.includes(location.pathname);

    if (isMainRoute) {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
    }

    const handleBackClick = () => {
      navigate(-1);
    };

    webApp.BackButton.onClick(handleBackClick);

    return () => {
      webApp.BackButton.offClick(handleBackClick);
    };
  }, [location.pathname, navigate]);

  return null;
}
