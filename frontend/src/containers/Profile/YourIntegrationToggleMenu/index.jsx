import { useState } from 'react';

const YourIntegrationToggleMenu = ({ setActiveSubSection }) => {
  const [activeSection, setActiveSection] = useState('officialwhatsapp');

  const handleButtonClick = (section) => {
    setActiveSection(section);
    setActiveSubSection(section);
  };

  const getButtonClass = (section) => (
    `p-2  rounded-xl w-1/6 text-base border-2  ${activeSection === section ? 'bg-blue-500 text-white' : ' hover:bg-indigo-100'}`
  );

  return (
    <div className="flex justify-around p-2 mb-14  rounded-xl  my-4">
      <button className={getButtonClass('officialwhatsapp')} onClick={() => handleButtonClick('officialwhatsapp')}>
        Official WhatsApp
      </button>
      <button className={getButtonClass('voice')} onClick={() => handleButtonClick('voice')}>
        Voice
      </button>
      <button className={getButtonClass('sms')} onClick={() => handleButtonClick('sms')}>
        SMS
      </button>
    </div>
  );
};

export default YourIntegrationToggleMenu;
