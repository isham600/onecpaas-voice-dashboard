import React, { useState } from 'react';
import {
  UserOutlined,
  IdcardOutlined,
  UserSwitchOutlined,
  LockOutlined,
  TagOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Profile, Personal, Account, ChangePassword, Role, Settings } from './tabs.jsx';

const LoginIntegration = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <Profile />;
      case 'personal':
        return <Personal />;
      case 'account':
        return <Account />;
      case 'password':
        return <ChangePassword />;
      case 'role':
        return <Role />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-2xl max-w-4xl">
      <nav className="nav flex justify-center mb-6">
        <ul className="flex space-x-6">
          {tabs.map((tab) => (
            <li key={tab.id} className={`nav-item ${activeTab === tab.id ? 'border-b-2 border-blue-500' : ''}`}>
              <button
                className={`nav-link flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 transition-all duration-300 ${activeTab === tab.id ? 'font-semibold text-blue-600' : ''}`}
                onClick={() => handleTabClick(tab.id)}
              >
                <span className="mr-2">{tab.icon}</span> {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content Container with a fade-in effect */}
      <div className="content p-6 bg-gray-50 rounded-lg shadow-lg transition-all duration-300 ease-in-out opacity-100">
        {renderContent()}
      </div>
    </div>
  );
};

const tabs = [
  { id: 'profile', label: 'Profile', icon: <UserOutlined /> },
  { id: 'personal', label: 'Personal', icon: <IdcardOutlined /> },
  { id: 'account', label: 'My Account', icon: <UserSwitchOutlined /> },
  { id: 'password', label: 'Change Password', icon: <LockOutlined /> },
  { id: 'role', label: 'Role', icon: <TagOutlined /> },
  { id: 'settings', label: 'Settings', icon: <SettingOutlined /> },
];

export default LoginIntegration;
