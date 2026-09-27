import React, { useState, useEffect } from 'react';
import { Button, Form, Input, message, Spin, Row, Col, Card, Divider } from 'antd';
import { LockOutlined, SaveOutlined, EditOutlined, CloseOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { getProfileMe, updateAccountInfo, clearProfileMeCache } from '../../services/api';
import handleApiError from '../../utils/errorHandler';

// Helper to detect if impersonation status changed
const getImpersonationKey = () => {
  try {
    const impersonating = JSON.parse(localStorage.getItem("_impersonating"));
    return impersonating?.username || 'main';
  } catch {
    return 'main';
  }
};

const Profile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    official_business_name: '',
    about: '',
  });
  const [impersonationKey, setImpersonationKey] = useState(getImpersonationKey());

  useEffect(() => {
    const currentKey = getImpersonationKey();
    if (currentKey !== impersonationKey) {
      setImpersonationKey(currentKey);
      clearProfileMeCache();
    }
    fetchProfileData();
  }, [impersonationKey]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      clearProfileMeCache();
      const response = await getProfileMe();
      const data = response?.data?.data;
      
      if (data?.profile) {
        const newData = {
          business_name: data.profile.business_name || '',
          official_business_name: data.profile.official_business_name || '',
          about: data.profile.about || '',
        };
        setFormData(newData);
        form.setFieldsValue(newData);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      message.success('Profile updated successfully');
      setIsEditing(false);
      clearProfileMeCache();
      fetchProfileData();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin />;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Business Profile</h3>
          <Button
            type={isEditing ? 'default' : 'primary'}
            icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={formData}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Business Name"
                name="business_name"
              >
                <Input 
                  placeholder="Enter business name"
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Official Business Name"
                name="official_business_name"
              >
                <Input 
                  placeholder="Enter official business name"
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="About"
            name="about"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Tell us about your business"
              disabled={!isEditing}
            />
          </Form.Item>

          {isEditing && (
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                <SaveOutlined /> Save Changes
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
};

const Personal = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    country: '',
  });
  const [impersonationKey, setImpersonationKey] = useState(getImpersonationKey());

  useEffect(() => {
    const currentKey = getImpersonationKey();
    if (currentKey !== impersonationKey) {
      setImpersonationKey(currentKey);
      clearProfileMeCache();
    }
    fetchProfileData();
  }, [impersonationKey]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      clearProfileMeCache();
      const response = await getProfileMe();
      const data = response?.data?.data;
      
      if (data?.user) {
        const newData = {
          firstname: data.user.firstname || '',
          lastname: data.user.lastname || '',
          country: data.user.country || '',
        };
        setFormData(newData);
        form.setFieldsValue(newData);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await updateAccountInfo({
        firstname: values.firstname,
        lastname: values.lastname,
        country: values.country,
      });
      message.success('Personal information updated successfully');
      setIsEditing(false);
      clearProfileMeCache();
      fetchProfileData();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin />;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Personal Information</h3>
          <Button
            type={isEditing ? 'default' : 'primary'}
            icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={formData}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First Name"
                name="firstname"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input 
                  placeholder="Enter first name" 
                  prefix={<UserOutlined />}
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last Name"
                name="lastname"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input 
                  placeholder="Enter last name" 
                  prefix={<UserOutlined />}
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Country"
            name="country"
          >
            <Input 
              placeholder="Enter country"
              disabled={!isEditing}
            />
          </Form.Item>

          {isEditing && (
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                <SaveOutlined /> Save Changes
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
};

const Account = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    mobile_no: '',
  });
  const [impersonationKey, setImpersonationKey] = useState(getImpersonationKey());

  useEffect(() => {
    const currentKey = getImpersonationKey();
    if (currentKey !== impersonationKey) {
      setImpersonationKey(currentKey);
      clearProfileMeCache();
    }
    fetchProfileData();
  }, [impersonationKey]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      clearProfileMeCache();
      const response = await getProfileMe();
      const data = response?.data?.data;
      
      if (data?.user) {
        const newData = {
          username: data.user.username || '',
          email: data.user.email || '',
          mobile_no: data.user.mobile_no || '',
        };
        setFormData(newData);
        form.setFieldsValue(newData);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await updateAccountInfo({
        email: values.email,
      });
      message.success('Account information updated successfully');
      setIsEditing(false);
      clearProfileMeCache();
      fetchProfileData();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin />;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Account Information</h3>
          <Button
            type={isEditing ? 'default' : 'primary'}
            icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={formData}
        >
          <Form.Item
            label="Username"
            name="username"
          >
            <Input 
              disabled 
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email Address"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input 
                  placeholder="Enter email address" 
                  prefix={<MailOutlined />}
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Mobile Number"
                name="mobile_no"
              >
                <Input 
                  disabled 
                  prefix={<PhoneOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          {isEditing && (
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                <SaveOutlined /> Save Changes
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
};

const ChangePassword = () => {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetchUsername();
  }, []);

  const fetchUsername = async () => {
    try {
      setLoading(true);
      const response = await getProfileMe();
      const data = response?.data?.data;
      if (data?.user?.username) {
        setUsername(data.user.username);
      }
    } catch {
      // username fetch failure is non-critical
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSuccess = () => {
    message.success('Password changed successfully');
    setPasswordModalOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <LockOutlined className="text-blue-600" />
              Password Settings
            </h3>
            <p className="text-gray-600 text-sm mt-2">
              Update your account password to keep your account secure. Your password must contain at least 8 characters, including uppercase letters, numbers, and special characters.
            </p>
          </div>
        </div>

        <Divider />

        <div className="mt-6">
          <Button
            type="primary"
            size="large"
            icon={<LockOutlined />}
            onClick={() => setPasswordModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            Change Password
          </Button>
        </div>
      </Card>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        username={username}
        title="Update Your Password"
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
};

const Role = () => {
  return <div className="p-6">Role Content</div>;
};

const Settings = () => {
  return <div className="p-6">Settings Content</div>;
};

export { Profile, Personal, Account, ChangePassword, Role, Settings };
