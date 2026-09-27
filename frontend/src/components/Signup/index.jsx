import { useState, useEffect } from "react";
import { signUp } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { Form, Input, Button, message, Progress, Checkbox, Divider, Steps } from "antd";
import {
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  MailOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SafetyOutlined,
  MobileOutlined,
  RocketOutlined,
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

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// Password requirements
const passwordRequirements = [
  { key: "length", label: "8+ characters", regex: /.{8,}/ },
  { key: "uppercase", label: "Uppercase", regex: /[A-Z]/ },
  { key: "lowercase", label: "Lowercase", regex: /[a-z]/ },
  { key: "number", label: "Number", regex: /[0-9]/ },
  { key: "special", label: "Special char", regex: /[^A-Za-z0-9]/ },
];

const Signup = ({ onChangeForm }) => {
  // State management
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Validation states
  const [emailValid, setEmailValid] = useState(null);
  const [usernameValid, setUsernameValid] = useState(null);
  const [mobileValid, setMobileValid] = useState(null);

  // Step validation
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [step3Valid, setStep3Valid] = useState(false);

  // Validate steps
  useEffect(() => {
    setStep1Valid(
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      emailValid === true
    );
  }, [firstName, lastName, emailValid]);

  useEffect(() => {
    setStep2Valid(usernameValid === true && mobileValid === true);
  }, [usernameValid, mobileValid]);

  useEffect(() => {
    setStep3Valid(
      passwordStrength >= 60 &&
      password === passwordConfirmation &&
      passwordConfirmation.length > 0 &&
      agreedToTerms
    );
  }, [passwordStrength, password, passwordConfirmation, agreedToTerms]);

  // Handle input changes
  const handleFirstNameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setFirstName(value);
    setErrorMessage("");
  };

  const handleLastNameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setLastName(value);
    setErrorMessage("");
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setErrorMessage("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(value ? emailRegex.test(value) : null);
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    setUsername(value);
    setErrorMessage("");
    setUsernameValid(value ? (value.length >= 3 && value.length <= 20) : null);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setErrorMessage("");
    let strength = 0;
    passwordRequirements.forEach((req) => {
      if (req.regex.test(value)) strength += 20;
    });
    setPasswordStrength(strength);
  };

  const handlePasswordConfirmationChange = (e) => {
    setPasswordConfirmation(e.target.value);
    setErrorMessage("");
  };

  const handlePhoneChange = (value, country) => {
    setMobileNumber(value);
    setErrorMessage("");
    form.setFieldsValue({ mobile_no: value });
    const cleanPhone = value.replace(/\D/g, "");
    setMobileValid(cleanPhone.length >= 10 && cleanPhone.length <= 15);
  };

  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 20) return "#ff4d4f";
    if (passwordStrength <= 40) return "#fa8c16";
    if (passwordStrength <= 60) return "#faad14";
    if (passwordStrength <= 80) return "#1890ff";
    return THEME.primary;
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength <= 20) return "Very Weak";
    if (passwordStrength <= 40) return "Weak";
    if (passwordStrength <= 60) return "Fair";
    if (passwordStrength <= 80) return "Good";
    return "Strong";
  };

  const handleSuccessfulSignup = () => {
    message.success("Account created successfully! Please log in.");
    setTimeout(() => onChangeForm("login"), 1500);
  };

  const handleSignupError = (error) => {
    const errData = error?.response?.data;
    if (errData?.message) {
      const errorMessages = typeof errData.message === "object"
        ? Object.values(errData.message).flat().join("\n")
        : errData.message;
      setErrorMessage(errorMessages);
      message.error(errorMessages);
    } else {
      handleApiError(error);
    }
  };

  const handleSubmit = async () => {
    if (!step1Valid || !step2Valid || !step3Valid) {
      message.error("Please complete all required fields");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await signUp({
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        email: email.trim(),
        username: username.trim(),
        mobile_no_demo: mobileNumber,
        password,
        password_confirmation: passwordConfirmation,
        domain: window.location.origin,
      });

      handleSuccessfulSignup();
    } catch (error) {
      handleSignupError(error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 0 && !step1Valid) {
      message.error("Please fill all fields correctly");
      return;
    }
    if (currentStep === 1 && !step2Valid) {
      message.error("Please fill all fields correctly");
      return;
    }
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const steps = [
    { title: "Personal", icon: <IdcardOutlined /> },
    { title: "Account", icon: <UserOutlined /> },
    { title: "Security", icon: <SafetyOutlined /> },
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            key="step1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: `#2563EB15` }}
                >
                  <IdcardOutlined style={{ fontSize: 28, color: THEME.primary }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
                <p className="text-sm text-gray-500">Let's start with your basic details</p>
              </div>

              <div className="flex gap-3">
                <Form.Item
                  name="firstname"
                  className="flex-1 mb-3"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input
                    prefix={<IdcardOutlined className="text-gray-400" />}
                    placeholder="First Name"
                    value={firstName}
                    onChange={handleFirstNameChange}
                    className="rounded-xl h-12"
                    size="large"
                    suffix={
                      firstName.length >= 2 ? (
                        <CheckCircleOutlined style={{ color: THEME.primary }} />
                      ) : null
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="lastname"
                  className="flex-1 mb-3"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input
                    prefix={<IdcardOutlined className="text-gray-400" />}
                    placeholder="Last Name"
                    value={lastName}
                    onChange={handleLastNameChange}
                    className="rounded-xl h-12"
                    size="large"
                    suffix={
                      lastName.length >= 2 ? (
                        <CheckCircleOutlined style={{ color: THEME.primary }} />
                      ) : null
                    }
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="email"
                className="mb-3"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Invalid email format" },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="Email Address"
                  value={email}
                  onChange={handleEmailChange}
                  className="rounded-xl h-12"
                  size="large"
                  suffix={
                    email && (
                      emailValid ? (
                        <CheckCircleOutlined style={{ color: THEME.primary }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                      )
                    )
                  }
                />
              </Form.Item>

              {email && !emailValid && (
                <p className="text-xs text-red-500 -mt-2 mb-2">Please enter a valid email address</p>
              )}
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="step2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: `#2563EB15` }}
                >
                  <UserOutlined style={{ fontSize: 28, color: THEME.primary }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Account Details</h3>
                <p className="text-sm text-gray-500">Set up your unique username and phone</p>
              </div>

              <Form.Item
                name="username"
                className="mb-3"
                normalize={(value) => value ? value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() : ""}
                rules={[
                  { required: true, message: "Please choose a username" },
                  { min: 3, message: "Min 3 characters" },
                ]}
              >
                <Input
                  prefix={<span className="text-gray-400 mr-1">@</span>}
                  placeholder="Choose a username"
                  value={username}
                  onChange={handleUsernameChange}
                  className="rounded-xl h-12"
                  size="large"
                  suffix={
                    username && (
                      usernameValid ? (
                        <CheckCircleOutlined style={{ color: THEME.primary }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                      )
                    )
                  }
                />
              </Form.Item>

              <p className="text-xs text-gray-400 -mt-2 mb-3">
                3-20 characters, lowercase letters, numbers, and underscore only
              </p>

              <Form.Item
                name="mobile_no"
                className="mb-3"
                rules={[{ required: true, message: "Please enter mobile number" }]}
              >
                <div className="relative">
                  <PhoneInput
                    country={"in"}
                    value={mobileNumber}
                    onChange={handlePhoneChange}
                    inputStyle={{
                      width: "100%",
                      height: "48px",
                      fontSize: "14px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "12px",
                      paddingLeft: "48px",
                    }}
                    containerStyle={{ width: "100%" }}
                    buttonStyle={{
                      border: "1px solid #d9d9d9",
                      borderRadius: "12px 0 0 12px",
                      backgroundColor: "#fafafa",
                      height: "48px",
                    }}
                    dropdownStyle={{ zIndex: 1050 }}
                    placeholder="Mobile Number"
                    enableSearch={true}
                    searchPlaceholder="Search country"
                    preferredCountries={["in", "us", "gb", "ca", "au"]}
                  />
                  {mobileNumber && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {mobileValid ? (
                        <CheckCircleOutlined style={{ color: THEME.primary }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                      )}
                    </div>
                  )}
                </div>
              </Form.Item>

              <div className="bg-gray-50 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <MobileOutlined className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Why we need your phone?</p>
                    <p className="text-xs text-gray-400">
                      For account security, OTP verification, and important notifications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: `#2563EB15` }}
                >
                  <SafetyOutlined style={{ fontSize: 28, color: THEME.primary }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Secure Your Account</h3>
                <p className="text-sm text-gray-500">Create a strong password</p>
              </div>

              <Form.Item
                name="password"
                className="mb-3"
                rules={[{ required: true, message: "Please enter a password" }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Create Password"
                  value={password}
                  onChange={handlePasswordChange}
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone twoToneColor={THEME.primary} /> : <EyeInvisibleOutlined />
                  }
                  className="rounded-xl h-12"
                  size="large"
                />
              </Form.Item>

              {password && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Progress
                      percent={passwordStrength}
                      size="small"
                      showInfo={false}
                      strokeColor={getPasswordStrengthColor()}
                      className="flex-1"
                    />
                    <span
                      className="text-xs font-semibold whitespace-nowrap"
                      style={{ color: getPasswordStrengthColor() }}
                    >
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {passwordRequirements.map((req) => (
                      <span
                        key={req.key}
                        className={`text-xs px-2 py-1 rounded-full transition-all ${
                          req.regex.test(password)
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {req.regex.test(password) ? "✓" : "○"} {req.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Form.Item
                name="password_confirmation"
                className="mb-3"
                rules={[{ required: true, message: "Please confirm password" }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Confirm Password"
                  value={passwordConfirmation}
                  onChange={handlePasswordConfirmationChange}
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone twoToneColor={THEME.primary} /> : <EyeInvisibleOutlined />
                  }
                  className="rounded-xl h-12"
                  size="large"
                  suffix={
                    passwordConfirmation && password === passwordConfirmation ? (
                      <CheckCircleOutlined style={{ color: THEME.primary }} />
                    ) : passwordConfirmation ? (
                      <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                    ) : null
                  }
                />
              </Form.Item>

              {passwordConfirmation && password !== passwordConfirmation && (
                <p className="text-xs text-red-500 -mt-2 mb-2">Passwords do not match</p>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="text-gray-600"
                >
                  <span className="text-sm">
                    I agree to the{" "}
                    <a style={{ color: THEME.primary }} className="hover:underline font-medium">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a style={{ color: THEME.primary }} className="hover:underline font-medium">
                      Privacy Policy
                    </a>
                  </span>
                </Checkbox>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="mx-auto my-auto max-w-xl w-full px-6 md:pl-0">
      <motion.div
        variants={primaryVariants}
        initial="initial"
        animate="animate"
        className="text-center mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
        <p className="text-gray-500">Join thousands of users today</p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div
        variants={primaryVariants}
        initial="initial"
        animate="animate"
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center"
              style={{ flex: index < steps.length - 1 ? 1 : 'none' }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  index <= currentStep
                    ? "text-white shadow-lg"
                    : "bg-gray-100 text-gray-400"
                }`}
                style={{
                  background: index <= currentStep ? THEME.gradient : undefined,
                }}
              >
                {index < currentStep ? <CheckCircleOutlined /> : step.icon}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: index < currentStep ? "100%" : "0%",
                      background: THEME.gradient,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between px-1">
          {steps.map((step, index) => (
            <span
              key={index}
              className={`text-xs font-medium transition-colors ${
                index <= currentStep ? "text-gray-700" : "text-gray-400"
              }`}
              style={{ color: index === currentStep ? THEME.primary : undefined }}
            >
              {step.title}
            </span>
          ))}
        </div>
      </motion.div>

      {errorMessage && (
        <motion.div variants={primaryVariants} initial="initial" animate="animate">
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center text-sm flex items-center justify-center gap-2">
            <CloseCircleOutlined />
            <span className="whitespace-pre-line">{errorMessage}</span>
          </div>
        </motion.div>
      )}

      <Form form={form} layout="vertical" className="w-full">
        <div className="min-h-[320px] relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <Button
              onClick={prevStep}
              icon={<ArrowLeftOutlined />}
              className="h-12 px-6 rounded-xl border-gray-200 hover:border-gray-300"
              size="large"
            >
              Back
            </Button>
          )}

          {currentStep < 2 ? (
            <Button
              type="primary"
              onClick={nextStep}
              disabled={
                (currentStep === 0 && !step1Valid) ||
                (currentStep === 1 && !step2Valid)
              }
              className="flex-1 h-12 rounded-xl text-base font-semibold shadow-lg"
              style={{
                background:
                  (currentStep === 0 && step1Valid) || (currentStep === 1 && step2Valid)
                    ? THEME.gradient
                    : "#d9d9d9",
                border: "none",
              }}
              size="large"
            >
              Continue <ArrowRightOutlined className="ml-2" />
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!step3Valid}
              icon={<RocketOutlined />}
              className="flex-1 h-12 rounded-xl text-base font-semibold shadow-lg"
              style={{
                background: step3Valid ? THEME.gradient : "#d9d9d9",
                border: "none",
              }}
              size="large"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          )}
        </div>

        <Divider className="my-6">
          <span className="text-gray-400 text-sm">or</span>
        </Divider>

        {/* Login link */}
        <div className="text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <a
              className="font-bold hover:underline cursor-pointer"
              style={{ color: THEME.primary }}
              onClick={() => onChangeForm("login")}
            >
              Log in
            </a>
          </p>
        </div>
      </Form>

      <style dangerouslySetInnerHTML={{__html: `
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
        .ant-form-item-explain-error {
          font-size: 12px;
        }
        .ant-btn-primary:disabled {
          color: white !important;
        }
      `}} />
    </div>
  );
};

export default Signup;
