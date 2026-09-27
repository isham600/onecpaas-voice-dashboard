import { useState, useEffect } from 'react';

const LoginIntegrationToggleMenu = ({ setActiveSubSection }) => {
  const [activeSection, setActiveSection] = useState('credentials');

  useEffect(() => {
    setActiveSubSection('credentials');
  }, [setActiveSubSection]);

  const handleButtonClick = (section) => {
    setActiveSection(section);
    setActiveSubSection(section);
  };

  const getButtonClass = (section) => (
    `p-2  rounded-xl w-1/6 text-base border-2  ${activeSection === section ? 'bg-blue-500 text-white' : ' hover:bg-indigo-100'}`
  );

  return (
    <div className="flex justify-around p-3 mb-14  rounded-xl my-0 bg-white">
      <button className={getButtonClass('credentials')} onClick={() => handleButtonClick('credentials')}>
        Login
      </button>
      <button className={getButtonClass('basicinfo')} onClick={() => handleButtonClick('basicinfo')}>
        Business Basic Information
      </button>
      <button className={getButtonClass('contactinfo')} onClick={() => handleButtonClick('contactinfo')}>
        Contact Information
      </button>
      <button className={getButtonClass('businessdetails')} onClick={() => handleButtonClick('businessdetails')}>
        Business Details
      </button>
      <button className={getButtonClass('additionalfields')} onClick={() => handleButtonClick('additionalfields')}>
        Additional Fields
      </button>
    </div>
  );
};

export default LoginIntegrationToggleMenu;
