import { useEffect, useState } from "react";
import { message, Button, Input, Typography, Form, Card } from "antd";
import {
  PlusOutlined,
  CloseOutlined,
  PhoneOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { voiceCallerId } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Title, Text } = Typography;

const CallerIdModal = ({ closeModal, handleSubmit, user }) => {
  const [state, setState] = useState({
    phoneNumber: "",
    otp: "",
    isOtpStage: false,
    isSubmitting: false,
    timer: 60,
  });

  const { phoneNumber, otp, isOtpStage, isSubmitting, timer } = state;

  const updateState = (key, value) => {
    setState((prevState) => ({ ...prevState, [key]: value }));
  };

  const handleAddCallerId = async () => {
    if (!phoneNumber.trim()) {
      message.error("Please enter a phone number");
      return;
    }

    updateState("isSubmitting", true);

    const payload = {
      action: "create",
      username: user,
      caller_id: phoneNumber,
    };

    try {
      const response = await voiceCallerId(payload);

      if (response?.data?.status) {
        message.success(
          "Caller ID added. Please enter the OTP sent to your number.",
        );
        updateState("isOtpStage", true);
        updateState("timer", 60);
      } else {
        message.error(response?.data?.message || "Failed to add caller ID");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      updateState("isSubmitting", false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp.trim()) {
      message.error("Please enter OTP");
      return;
    }

    updateState("isSubmitting", true);

    const payload = {
      action: "verify",
      username: user,
      caller_id: phoneNumber,
      otp,
    };

    try {
      const response = await voiceCallerId(payload);

      if (response?.data?.status) {
        message.success("OTP verified successfully!");
        handleSubmit(phoneNumber);
        closeModal();
      } else {
        message.error(response?.data?.message || "OTP verification failed");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      updateState("isSubmitting", false);
    }
  };

  const handleResendOtp = async () => {
    updateState("isSubmitting", true);
    updateState("timer", 60);
    await handleAddCallerId();
  };

  useEffect(() => {
    let countdown;
    if (isOtpStage && timer > 0) {
      countdown = setInterval(() => {
        updateState("timer", timer - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(countdown);
    }
    return () => clearInterval(countdown);
  }, [timer, isOtpStage]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <PlusOutlined className="text-white text-xl" />
        </div>
        <div>
          <Title level={4} className="!m-0 text-gray-900">
            Add Caller ID
          </Title>
          <Text className="text-gray-500 text-sm">
            {!isOtpStage
              ? "Enter your phone number to add as caller ID"
              : "Enter the OTP sent to your phone"}
          </Text>
        </div>
      </div>

      {!isOtpStage ? (
        // Phone Number Stage
        <Card className="border border-blue-200 bg-blue-50">
          <Form layout="vertical" onFinish={handleAddCallerId}>
            <Form.Item
              label={
                <span className="flex items-center gap-2 text-gray-700 font-medium">
                  <PhoneOutlined />
                  Phone Number
                </span>
              }
              required
              className="mb-6"
            >
              <Input
                placeholder="Enter your phone number (e.g., +1234567890)"
                value={phoneNumber}
                onChange={(e) => updateState("phoneNumber", e.target.value)}
                size="large"
                disabled={isSubmitting}
                className="rounded-lg"
                maxLength={15}
              />
            </Form.Item>

            <div className="flex justify-end gap-3 mt-8">
              <Button
                onClick={closeModal}
                icon={<CloseOutlined />}
                size="large"
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleAddCallerId}
                loading={isSubmitting}
                size="large"
                className="px-8 bg-blue-500 hover:bg-blue-600"
              >
                {isSubmitting ? "Adding..." : "Add Caller ID"}
              </Button>
            </div>
          </Form>
        </Card>
      ) : (
        // OTP Verification Stage
        <Card className="border border-green-200 bg-green-50">
          <Form layout="vertical" onFinish={handleOtpSubmit}>
            <Form.Item
              label={
                <span className="flex items-center gap-2 text-gray-700 font-medium">
                  <SafetyOutlined />
                  Enter OTP
                </span>
              }
              required
              className="mb-2"
            >
              <Input
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => updateState("otp", e.target.value)}
                size="large"
                maxLength={6}
                className="rounded-lg text-center text-lg tracking-widest"
              />
            </Form.Item>

            {/* Timer Display */}
            <div className="text-center mb-6 mt-4">
              <Text
                className={`text-sm font-medium ${
                  timer > 0 ? "text-red-500" : "text-green-600"
                }`}
              >
                {timer > 0
                  ? `OTP expires in ${timer < 10 ? `0${timer}` : timer} seconds`
                  : "You can now resend OTP"}
              </Text>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button
                onClick={handleResendOtp}
                disabled={timer > 0 || isSubmitting}
                loading={isSubmitting && timer === 60}
                size="large"
                className="px-6"
              >
                {isSubmitting && timer === 60 ? "Resending..." : "Resend OTP"}
              </Button>

              <Button
                type="primary"
                onClick={handleOtpSubmit}
                loading={isSubmitting && timer !== 60}
                size="large"
                className="px-8 bg-green-500 hover:bg-green-600"
              >
                {isSubmitting && timer !== 60 ? "Verifying..." : "Verify OTP"}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* Info Box */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <Text className="text-xs text-gray-600">
          <strong>Note:</strong> The caller ID will be used to identify your
          voice broadcasts. Make sure you have access to this phone number for
          OTP verification.
        </Text>
      </div>
    </>
  );
};

export default CallerIdModal;
