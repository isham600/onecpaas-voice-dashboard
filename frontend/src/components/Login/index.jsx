import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, requestMobileOtp, verifyMobileOtp } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { Form, Input, Button, Checkbox, message, Tabs } from "antd";
import {
  UserOutlined,
  LockOutlined,
  MobileOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import handleApiError from "../../utils/errorHandler";

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

// Animation variants
const primaryVariants = {
  initial: { y: 25, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
};

const Login = ({ onChangeForm, setUser }) => {
  // State management
  const [form] = Form.useForm();
  const [email, setEmail] = useState("");
  const [isEmailDisabled, setIsEmailDisabled] = useState(false);
  const [isMobileLogin, setIsMobileLogin] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [captcha1, setCaptcha1] = useState(0);
  const [captcha2, setCaptcha2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState("");
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Generate captcha numbers
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setCaptcha1(num1);
    setCaptcha2(num2);
    setCaptchaInput("");
    setIsCaptchaValid(false);
  };

  // Generate captcha on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Handle input changes
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setErrorMessage("");
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setErrorMessage("");
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    setErrorMessage("");
  };

  // Handle phone number change
  const handlePhoneChange = (value, country) => {
    setMobileNumber(value);
    setErrorMessage("");
    form.setFieldsValue({ mobileNumber: value });
  };

  // Validate phone number
  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return false;
    if (cleanPhone.length > 15) return false;
    return true;
  };

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) || email.length >= 3; // Allow username or email
  };

  // Validate captcha input
  const handleCaptchaChange = (e) => {
    const value = e.target.value;
    setCaptchaInput(value);
    setIsCaptchaValid(parseInt(value) === captcha1 + captcha2);
  };

  // Handle successful login
  const handleSuccessfulLogin = (data) => {
    localStorage.setItem("token", data?.token);
    localStorage.setItem("user", JSON.stringify(data?.user));
    setUser(data?.user);
    message.success("Login successful! Redirecting...");
    navigate("/dashboard", { replace: true });
  };

  // Handle login error
  const handleLoginError = (error) => {
    console.error("Error logging in", error);
    const status = error?.response?.status;
    const errorMsg = error?.response?.data?.message || "Failed to login. Please check your credentials.";
    
    // Handle account expiry (401 from login)
    if (status === 401 && errorMsg.toLowerCase().includes("account expired")) {
      setErrorMessage("Account expired. Please contact your administrator.");
      message.error("Account expired. Please contact your administrator.");
      generateCaptcha();
      return;
    }
    
    setErrorMessage(errorMsg);
    message.error(errorMsg);
    generateCaptcha();
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isCaptchaValid) {
      message.error("Please solve the CAPTCHA correctly");
      return;
    }

    // Validate phone number for mobile login
    if (isMobileLogin && !validatePhoneNumber(mobileNumber)) {
      message.error("Please enter a valid phone number (10-15 digits)");
      return;
    }

    // Validate email/username for regular login
    if (!isMobileLogin && !validateEmail(email)) {
      message.error("Please enter a valid email or username");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    if (isMobileLogin) {
      if (!otpRequested) {
        // Request OTP
        try {
          await requestMobileOtp(mobileNumber);
          setOtpRequested(true);
          setErrorMessage("");
          setIsEmailDisabled(true);
          message.success("OTP sent to your mobile number");
        } catch (error) {
          handleApiError(error);
        }
      } else {
        // Verify OTP and login
        try {
          const response = await verifyMobileOtp(mobileNumber, otp);
          handleSuccessfulLogin(response?.data);
        } catch (error) {
          handleLoginError(error);
        }
      }
    } else {
      // Email/Username login
      try {
        const response = await login({ email_or_username: email, password });
        handleSuccessfulLogin(response.data);
      } catch (error) {
        handleLoginError(error);
      }
    }

    setLoading(false);
  };

  const handleLoginTypeChange = (key) => {
    const newIsMobileLogin = key === "mobile";
    setIsMobileLogin(newIsMobileLogin);
    setOtpRequested(false);
    setErrorMessage("");
    setIsEmailDisabled(false);
    setMobileNumber("");
    setPassword("");
    setEmail("");

    if (newIsMobileLogin) {
      form.resetFields(["email", "password", "remember"]);
    } else {
      form.resetFields(["mobileNumber", "otp"]);
    }
  };

  const handleEnterSubmit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.submit();
    }
  };

  return (
    <div className="mx-auto my-auto max-w-xl w-full px-8 md:pl-0">
      {errorMessage && (
        <motion.div
          variants={primaryVariants}
          initial="initial"
          animate="animate"
        >
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center flex items-center justify-center gap-2">
            <CloseCircleOutlined />
            {errorMessage}
          </div>
        </motion.div>
      )}

      <motion.div variants={primaryVariants} initial="initial" animate="animate">
        <Tabs
          centered
          activeKey={isMobileLogin ? "mobile" : "email"}
          onChange={handleLoginTypeChange}
          className="auth-tabs"
          items={[
            {
              key: "email",
              label: (
                <span className="flex items-center gap-2 px-4">
                  <UserOutlined />
                  Username
                </span>
              ),
            },
            {
              key: "mobile",
              label: (
                <span className="flex items-center gap-2 px-4">
                  <MobileOutlined />
                  Mobile
                </span>
              ),
            },
          ]}
        />
      </motion.div>

      <Form
        form={form}
        onFinish={handleSubmit}
        onKeyDown={handleEnterSubmit}
        layout="vertical"
        className="w-full mt-4"
        preserve={false}
      >
        <AnimatePresence mode="wait">
          {/* Email/Username login form */}
          {!isMobileLogin ? (
            <motion.div
              key="email-form"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={{
                initial: { opacity: 0, x: -20 },
                animate: { opacity: 1, x: 0 },
                exit: { opacity: 0, x: 20 },
              }}
            >
              <motion.div variants={primaryVariants} className="mb-2 w-full">
                <Form.Item
                  name="email"
                  label={<span className="font-medium text-gray-700">Email / Username</span>}
                  rules={[
                    {
                      required: true,
                      message: "Please enter your email or username",
                    },
                    {
                      min: 3,
                      message: "Must be at least 3 characters",
                    },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="text-gray-400" />}
                    placeholder="example@email.com or username"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={isEmailDisabled}
                    className="rounded-lg h-11"
                    size="large"
                  />
                </Form.Item>
              </motion.div>

              <motion.div variants={primaryVariants} className="mb-2 w-full">
                <Form.Item
                  name="password"
                  label={<span className="font-medium text-gray-700">Password</span>}
                  rules={[
                    {
                      required: true,
                      message: "Please enter your password",
                    },
                    {
                      min: 6,
                      message: "Password must be at least 6 characters",
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Enter your password"
                    value={password}
                    onChange={handlePasswordChange}
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone twoToneColor={THEME.primary} /> : <EyeInvisibleOutlined />
                    }
                    className="rounded-lg h-11"
                    size="large"
                  />
                </Form.Item>
              </motion.div>

              <motion.div
                variants={primaryVariants}
                className="flex justify-between mb-4"
              >
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox className="text-gray-600">Remember me</Checkbox>
                </Form.Item>
                <a
                  className="font-medium hover:underline cursor-pointer"
                  style={{ color: THEME.primary }}
                  onClick={() => onChangeForm("forgot")}
                >
                  Forgot Password?
                </a>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="mobile-form"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={{
                initial: { opacity: 0, x: 20 },
                animate: { opacity: 1, x: 0 },
                exit: { opacity: 0, x: -20 },
              }}
            >
              <motion.div variants={primaryVariants} className="mb-4 w-full">
                <Form.Item
                  name="mobileNumber"
                  label={<span className="font-medium text-gray-700">Registered Mobile Number</span>}
                  rules={[
                    { required: true, message: "Please enter your mobile number" },
                    {
                      validator: (_, value) => {
                        if (!mobileNumber) {
                          return Promise.reject(new Error("Please enter mobile number"));
                        }
                        if (!validatePhoneNumber(mobileNumber)) {
                          return Promise.reject(new Error("Enter a valid phone number (10-15 digits)"));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <PhoneInput
                    country={"in"}
                    value={mobileNumber}
                    onChange={handlePhoneChange}
                    disabled={otpRequested}
                    inputStyle={{
                      width: "100%",
                      height: "44px",
                      fontSize: "14px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "8px",
                      paddingLeft: "48px",
                      backgroundColor: otpRequested ? "#f5f5f5" : "#ffffff",
                    }}
                    containerStyle={{ width: "100%" }}
                    buttonStyle={{
                      border: "1px solid #d9d9d9",
                      borderRadius: "8px 0 0 8px",
                      backgroundColor: otpRequested ? "#f5f5f5" : "#fafafa",
                      height: "44px",
                    }}
                    dropdownStyle={{ zIndex: 1050 }}
                    placeholder="Enter phone number"
                    enableSearch={true}
                    searchPlaceholder="Search country"
                    preferredCountries={["in", "us", "gb", "ca", "au"]}
                  />
                </Form.Item>
              </motion.div>

              {otpRequested && (
                <motion.div
                  variants={primaryVariants}
                  initial="initial"
                  animate="animate"
                  className="mb-4 w-full"
                >
                  <Form.Item
                    name="otp"
                    label={<span className="font-medium text-gray-700">Enter OTP</span>}
                    rules={[
                      { required: true, message: "Please enter the OTP" },
                      { len: 6, message: "OTP must be 6 digits" },
                    ]}
                  >
                    <Input
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={handleOtpChange}
                      className="rounded-lg h-11 text-center text-lg tracking-widest"
                      size="large"
                      maxLength={6}
                    />
                  </Form.Item>
                  <p className="text-sm text-gray-500 text-center">
                    OTP sent to +{mobileNumber}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAPTCHA */}
        <motion.div variants={primaryVariants} initial="initial" animate="animate" className="my-6 w-full">
          <Form.Item
            name="captcha"
            rules={[{ required: true, message: "Please solve the CAPTCHA" }]}
            className="mb-4"
          >
            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-600 font-medium">Solve:</span>
              <span className="text-xl font-bold" style={{ color: THEME.primary }}>
                {captcha1} + {captcha2}
              </span>
              <span className="text-gray-600">=</span>
              <Input
                className="w-20 text-center rounded-lg"
                value={captchaInput}
                onChange={handleCaptchaChange}
                placeholder="?"
                status={captchaInput && !isCaptchaValid ? "error" : isCaptchaValid ? "" : ""}
                suffix={
                  isCaptchaValid ? (
                    <CheckCircleOutlined style={{ color: THEME.primary }} />
                  ) : null
                }
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={generateCaptcha}
                type="text"
                className="hover:bg-gray-100"
              />
            </div>
          </Form.Item>
        </motion.div>

        {/* Submit button */}
        <motion.div variants={primaryVariants} initial="initial" animate="animate">
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={!isCaptchaValid}
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{
                background: isCaptchaValid ? THEME.gradient : "#d9d9d9",
                border: "none",
              }}
            >
              {loading ? "Please wait..." : otpRequested ? "Verify & Login" : isMobileLogin ? "Send OTP" : "Login"}
            </Button>
          </Form.Item>
        </motion.div>

        {/* Sign up link */}
        <motion.div variants={primaryVariants} initial="initial" animate="animate" className="text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <a
              className="font-bold hover:underline cursor-pointer"
              style={{ color: THEME.primary }}
              onClick={() => onChangeForm("signup")}
            >
              Sign up
            </a>
          </p>
        </motion.div>
      </Form>

      <style dangerouslySetInnerHTML={{__html: `
        .auth-tabs .ant-tabs-tab {
          padding: 8px 0;
          font-size: 14px;
        }
        .auth-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #2563EB !important;
        }
        .auth-tabs .ant-tabs-ink-bar {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
        }
        .auth-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
          color: #1D4ED8;
        }
        .ant-input:focus,
        .ant-input-affix-wrapper:focus,
        .ant-input-affix-wrapper-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }
        .ant-input:hover,
        .ant-input-affix-wrapper:hover {
          border-color: #2563EB !important;
        }
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #2563EB;
          border-color: #2563EB;
        }
        .ant-checkbox:hover .ant-checkbox-inner {
          border-color: #2563EB;
        }
      `}} />
    </div>
  );
};

export default Login;
