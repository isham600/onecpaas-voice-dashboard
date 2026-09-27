import { useState } from 'react';

const ResellerSettingsToggleMenu = ({ setActiveSubSection }) => {
  const [activeSection, setActiveSection] = useState('whitelabeloptions');

  const handleButtonClick = (section) => {
    setActiveSection(section);
    setActiveSubSection(section);
  };

  const getButtonClass = (section) => (
    `p-2  rounded-xl w-1/6 text-base border-2  ${activeSection === section ? 'bg-blue-500 text-white' : ' hover:bg-indigo-100'}`
  );

  return (
    <div className="flex justify-around p-2 mb-14  rounded-xl  my-4">
      <button className={getButtonClass('whitelabeloptions')} onClick={() => handleButtonClick('whitelabeloptions')}>
        White-Label Options
      </button>
      <button className={getButtonClass('notificationsalerts')} onClick={() => handleButtonClick('notificationsalerts')}>
        Notifications and Alerts
      </button>
    </div>
  );
};

export default ResellerSettingsToggleMenu;
