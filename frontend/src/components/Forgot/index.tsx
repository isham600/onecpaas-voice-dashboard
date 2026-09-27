import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Form, Input, Button, message, Progress } from "antd";
import {
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { forgotPassword, verifyResetOtp, resetPassword } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const slideVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const fadeUp = {
  initial: { y: 25, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

const passwordRequirements = [
  { key: "length",    label: "8+ chars",   regex: /.{8,}/ },
  { key: "uppercase", label: "Uppercase",  regex: /[A-Z]/ },
  { key: "lowercase", label: "Lowercase",  regex: /[a-z]/ },
  { key: "number",    label: "Number",     regex: /[0-9]/ },
  { key: "special",   label: "Special",    regex: /[^A-Za-z0-9]/ },
];

const STEPS = [
  { id: "initial",  label: "Request OTP",  Icon: MailOutlined },
  { id: "otp",      label: "Verify OTP",   Icon: SafetyOutlined },
  { id: "password", label: "New Password", Icon: LockOutlined },
];

const OTP_VALID_SECONDS = 600; // 10 min — matches backend

const ForgotPassword = ({ onChangeForm }) => {
  const [form] = Form.useForm();
  const [step, setStep] = useState<"initial" | "otp" | "password">("initial");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timeLeft, setTimeLeft] = useState(OTP_VALID_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Captcha
  const [captcha1, setCaptcha1] = useState(0);
  const [captcha2, setCaptcha2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState("");
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);

  const generateCaptcha = () => {
    setCaptcha1(Math.floor(Math.random() * 9) + 1);
    setCaptcha2(Math.floor(Math.random() * 9) + 1);
    setCaptchaInput("");
    setIsCaptchaValid(false);
  };

  useEffect(() => { generateCaptcha(); }, []);

  // OTP countdown
  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      setTimerActive(false);
      message.error("OTP expired. Please request a new one.");
      setStep("initial");
      generateCaptcha();
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const strengthColor = () => {
    if (passwordStrength <= 20) return "#ff4d4f";
    if (passwordStrength <= 40) return "#fa8c16";
    if (passwordStrength <= 60) return "#faad14";
    if (passwordStrength <= 80) return "#1890ff";
    return THEME.primary;
  };

  // ── Step 1: request OTP ────────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!isCaptchaValid) { message.error("Please solve the CAPTCHA"); return; }
    if (!email) { message.error("Please enter your email address"); return; }
    setErrorMessage("");
    setLoading(true);
    try {
      await forgotPassword(email);
      // Always show success — backend never reveals if email exists
      message.success("If that email is registered, an OTP has been sent.");
      setStep("otp");
      setTimeLeft(OTP_VALID_SECONDS);
      setTimerActive(true);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP → get reset_token ──────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { message.error("Enter the 6-digit OTP"); return; }
    setErrorMessage("");
    setLoading(true);
    try {
      const res = await verifyResetOtp(email, otp);
      const token = res.data?.reset_token;
      if (!token) throw new Error("No reset token received");
      setResetToken(token);
      setTimerActive(false);
      setStep("password");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid or expired OTP";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: reset password ─────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) { setErrorMessage("Passwords do not match"); return; }
    if (passwordStrength < 60) { message.error("Please use a stronger password"); return; }
    setErrorMessage("");
    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      message.success("Password reset! All sessions have been signed out.");
      setTimeout(() => onChangeForm("login"), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to reset password";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto my-auto max-w-xl w-full px-8 md:pl-0">
      <motion.h1 {...fadeUp} className="mb-2 text-center text-4xl font-semibold text-gray-800">
        Reset Password
      </motion.h1>
      <motion.p {...fadeUp} className="mb-6 text-center text-gray-500">
        We'll help you recover your account securely
      </motion.p>

      {errorMessage && (
        <motion.div {...fadeUp} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center flex items-center justify-center gap-2">
          <CloseCircleOutlined /> {errorMessage}
        </motion.div>
      )}

      {/* Step indicator */}
      <motion.div {...fadeUp} className="mb-6">
        <div className="flex justify-between mb-4">
          {STEPS.map(({ id, label, Icon }, i) => {
            const isActive = step === id;
            const isPast = i < stepIndex;
            return (
              <div key={id} className="flex flex-col items-center w-1/3">
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    background: isActive || isPast ? THEME.gradient : "#e5e7eb",
                    color: isActive || isPast ? "#fff" : "#9ca3af",
                  }}
                >
                  {isPast ? <CheckCircleOutlined /> : <Icon />}
                </div>
                <span className="text-xs mt-2 font-medium" style={{ color: isActive ? THEME.primary : "#9ca3af" }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ background: THEME.gradient }}
            animate={{ width: stepIndex === 0 ? "0%" : stepIndex === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      <Form form={form} layout="vertical" className="w-full">
        <AnimatePresence mode="wait">

          {/* ── Step 1: email + captcha ── */}
          {step === "initial" && (
            <motion.div key="initial" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <Form.Item
                name="email"
                label={<span className="font-medium text-gray-700">Email Address</span>}
                rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
              >
                <Input
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMessage(""); }}
                  className="rounded-lg h-11"
                  size="large"
                />
              </Form.Item>

              <Form.Item name="captcha" className="mb-6">
                <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-600 font-medium">Solve:</span>
                  <span className="text-xl font-bold" style={{ color: THEME.primary }}>
                    {captcha1} + {captcha2}
                  </span>
                  <span className="text-gray-600">=</span>
                  <Input
                    className="w-20 text-center rounded-lg"
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value);
                      setIsCaptchaValid(parseInt(e.target.value) === captcha1 + captcha2);
                    }}
                    placeholder="?"
                    status={captchaInput && !isCaptchaValid ? "error" : ""}
                    suffix={isCaptchaValid ? <CheckCircleOutlined style={{ color: THEME.primary }} /> : null}
                  />
                  <Button icon={<ReloadOutlined />} onClick={generateCaptcha} type="text" />
                </div>
              </Form.Item>

              <Button
                type="primary"
                onClick={handleRequestOtp}
                loading={loading}
                disabled={!isCaptchaValid}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg"
                style={{ background: isCaptchaValid ? THEME.gradient : "#d9d9d9", border: "none" }}
              >
                Send OTP
              </Button>
            </motion.div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <motion.div key="otp" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full mb-3">
                  <CheckCircleOutlined style={{ color: THEME.primary }} />
                  <span style={{ color: THEME.primary }} className="font-medium">OTP Sent</span>
                </div>
                <p className="text-gray-600">
                  We've sent a 6-digit code to <strong>{email}</strong>
                </p>
                <p className="mt-2 font-medium" style={{ color: timeLeft < 60 ? "#ff4d4f" : THEME.primary }}>
                  Expires in: {formatTime(timeLeft)}
                </p>
              </div>

              <Form.Item
                name="otp"
                label={<span className="font-medium text-gray-700">Enter OTP</span>}
                rules={[{ required: true, len: 6, message: "Enter the 6-digit OTP" }]}
              >
                <Input
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrorMessage(""); }}
                  className="rounded-lg h-14 text-center text-2xl tracking-[1em] font-mono"
                  maxLength={6}
                />
              </Form.Item>

              <div className="flex justify-between mb-6">
                <Button
                  type="text"
                  onClick={handleRequestOtp}
                  disabled={loading || timeLeft > OTP_VALID_SECONDS - 60}
                  style={{ color: THEME.primary }}
                >
                  Resend OTP
                </Button>
                <Button
                  type="text"
                  onClick={() => { setStep("initial"); form.resetFields(); generateCaptcha(); }}
                  style={{ color: THEME.primary }}
                >
                  Change Email
                </Button>
              </div>

              <Button
                type="primary"
                onClick={handleVerifyOtp}
                loading={loading}
                disabled={otp.length !== 6}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg"
                style={{ background: otp.length === 6 ? THEME.gradient : "#d9d9d9", border: "none" }}
              >
                Verify OTP
              </Button>
            </motion.div>
          )}

          {/* ── Step 3: new password ── */}
          {step === "password" && (
            <motion.div key="password" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full mb-3">
                  <CheckCircleOutlined style={{ color: THEME.primary }} />
                  <span style={{ color: THEME.primary }} className="font-medium">Identity Verified</span>
                </div>
                <p className="text-gray-600">Create a strong new password. All existing sessions will be signed out.</p>
              </div>

              <Form.Item
                name="newPassword"
                label={<span className="font-medium text-gray-700">New Password</span>}
                rules={[{ required: true, min: 8, message: "Min 8 characters" }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewPassword(v);
                    setErrorMessage("");
                    setPasswordStrength(passwordRequirements.filter((r) => r.regex.test(v)).length * 20);
                  }}
                  iconRender={(v) => v ? <EyeTwoTone twoToneColor={THEME.primary} /> : <EyeInvisibleOutlined />}
                  className="rounded-lg h-11"
                  size="large"
                />
              </Form.Item>

              {newPassword && (
                <div className="mb-4">
                  <Progress percent={passwordStrength} size="small" showInfo={false} strokeColor={strengthColor()} />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {passwordRequirements.map((r) => (
                      <span
                        key={r.key}
                        className={`text-xs px-2 py-1 rounded-full ${r.regex.test(newPassword) ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}
                      >
                        {r.regex.test(newPassword) ? "✓" : "○"} {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Form.Item
                name="confirmPassword"
                label={<span className="font-medium text-gray-700">Confirm Password</span>}
                rules={[
                  { required: true, message: "Please confirm your password" },
                  () => ({
                    validator(_, value) {
                      return !value || newPassword === value
                        ? Promise.resolve()
                        : Promise.reject(new Error("Passwords don't match"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(""); }}
                  iconRender={(v) => v ? <EyeTwoTone twoToneColor={THEME.primary} /> : <EyeInvisibleOutlined />}
                  className="rounded-lg h-11"
                  size="large"
                  suffix={confirmPassword && newPassword === confirmPassword ? <CheckCircleOutlined style={{ color: THEME.primary }} /> : null}
                />
              </Form.Item>

              <Button
                type="primary"
                onClick={handleResetPassword}
                loading={loading}
                disabled={passwordStrength < 60 || newPassword !== confirmPassword}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg"
                style={{
                  background: passwordStrength >= 60 && newPassword === confirmPassword ? THEME.gradient : "#d9d9d9",
                  border: "none",
                }}
              >
                Reset Password
              </Button>
            </motion.div>
          )}

        </AnimatePresence>

        <motion.div {...fadeUp} className="text-center mt-6">
          <p className="text-gray-600">
            Remember your password?{" "}
            <a
              className="font-bold hover:underline cursor-pointer"
              style={{ color: THEME.primary }}
              onClick={() => onChangeForm("login")}
            >
              Back to Login
            </a>
          </p>
        </motion.div>
      </Form>

      <style dangerouslySetInnerHTML={{__html: `
        .ant-input:focus, .ant-input-affix-wrapper:focus, .ant-input-affix-wrapper-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }
        .ant-input:hover, .ant-input-affix-wrapper:hover {
          border-color: #2563EB !important;
        }
      `}} />
    </div>
  );
};

export default ForgotPassword;
