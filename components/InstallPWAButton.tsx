import React, { useState, useEffect } from 'react';
import { ArrowDownToLineIcon } from './icons';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

const InstallPWAButton: React.FC<{isTeacher?: boolean}> = ({ isTeacher }) => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Only show the button if not in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
        // Hide the app-provided install promotion
        setIsVisible(false);
        // Clear the deferred prompt so it can be garbage collected
        setInstallPrompt(null);
        // Optionally, send analytics event to indicate successful install
        console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the prompt
    installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, hide button
    setIsVisible(false);
    setInstallPrompt(null);
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  if (!isVisible) {
    return null;
  }
  
  const buttonClass = isTeacher 
    ? "flex items-center space-x-2 bg-secondary text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 text-sm shadow-sm"
    : "flex items-center text-sm text-textSecondary hover:text-primary";

  return (
    <button onClick={handleInstallClick} className={buttonClass} title="Install App">
      <ArrowDownToLineIcon className="w-4 h-4 mr-1" />
      Install App
    </button>
  );
};

export default InstallPWAButton;