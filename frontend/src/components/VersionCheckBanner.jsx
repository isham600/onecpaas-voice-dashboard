import React, { useState, useEffect } from 'react';
import { startVersionCheck, stopVersionCheck } from '../utils/versionCheck';

const VersionCheckBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    startVersionCheck(() => {
      setShowBanner(true);
    });

    return () => stopVersionCheck();
  }, []);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #1890ff 0%, #0050b3 100%)',
        color: 'white',
        padding: '12px 20px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      ✨ App updated. Reloading in 2 seconds...
    </div>
  );
};

export default VersionCheckBanner;
