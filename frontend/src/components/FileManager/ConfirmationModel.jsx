// The ConfirmationModal component takes in three props:
// 1. isOpen: A boolean that determines if the modal should be displayed.
// 2. onClose: A function that handles the closing of the modal.
// 3. onConfirm: A function that handles the confirmation action.
const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  // Conditional Rendering: If the modal is not open (`isOpen` is false),
  // the component returns null, meaning nothing will be rendered.
  if (!isOpen) return null;

  // If `isOpen` is true, the modal is rendered.
  return (
    // Container div that covers the entire viewport with a semi-transparent background.
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      {/* The modal content container */}
      <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full">
        {/* Header section with a title */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Confirmation</h2>
        </div>

        {/* Body section containing the confirmation message */}
        <div className="p-4">
          <p>Are you sure you want to delete this file?</p>
        </div>

        {/* Footer section with action buttons */}
        <div className="flex justify-end space-x-2 p-4 border-t border-gray-200">
          {/* Cancel button: triggers the onClose function */}
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded"
            onClick={onClose}
          >
            Cancel
          </button>

          {/* Delete button: triggers the onConfirm function */}
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
