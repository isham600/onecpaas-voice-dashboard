import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";
import "./DatePickerComponent.css";

const DatePickerComponent = ({ onStartDateChange, onEndDateChange }) => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [period, setPeriod] = useState("Last 7 days");

  const handleStartDateChange = (date) => {
    setStartDate(date);
    onStartDateChange(dayjs(date).format("YYYY-MM-DD"));
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
    onEndDateChange(dayjs(date).format("YYYY-MM-DD"));
  };

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
    const currentDate = new Date();
    let newStartDate;
    switch (event.target.value) {
      case "Last 7 days":
        newStartDate = new Date(currentDate.setDate(currentDate.getDate() - 7));
        break;
      case "Last 30 days":
        newStartDate = new Date(
          currentDate.setDate(currentDate.getDate() - 30),
        );
        break;
      case "Last 90 days":
        newStartDate = new Date(
          currentDate.setDate(currentDate.getDate() - 90),
        );
        break;
      case "Last 6 months":
        newStartDate = new Date(
          currentDate.setMonth(currentDate.getMonth() - 6),
        );
        break;
      case "Last year":
        newStartDate = new Date(
          currentDate.setFullYear(currentDate.getFullYear() - 1),
        );
        break;
      default:
        newStartDate = new Date();
    }
    setStartDate(newStartDate);
    setEndDate(new Date());
    onStartDateChange(dayjs(newStartDate).format("YYYY-MM-DD"));
    onEndDateChange(dayjs().format("YYYY-MM-DD"));
  };

  return (
    <motion.div
      className="date-range-filter bg-white rounded-lg shadow-lg p-6 mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ fontFamily: "'Mulish', sans-serif" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          className="date-range-filter__item"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date picker from
          </label>
          <div className="relative">
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              dateFormat="MM/dd/yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
            <FontAwesomeIcon
              icon={faCalendarAlt}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500"
            />
          </div>
        </motion.div>

        <motion.div
          className="date-range-filter__item"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date picker to
          </label>
          <div className="relative">
            <DatePicker
              selected={endDate}
              onChange={handleEndDateChange}
              dateFormat="MM/dd/yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
            <FontAwesomeIcon
              icon={faCalendarAlt}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500"
            />
          </div>
        </motion.div>

        <motion.div
          className="date-range-filter__item"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Period
          </label>
          <select
            value={period}
            onChange={handlePeriodChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
          >
            <option value="Last 7 days">Last 7 days</option>
            <option value="Last 30 days">Last 30 days</option>
            <option value="Last 90 days">Last 90 days</option>
            <option value="Last 6 months">Last 6 months</option>
            <option value="Last year">Last year</option>
            <option value="Custom Range">Custom Range</option>
          </select>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DatePickerComponent;
