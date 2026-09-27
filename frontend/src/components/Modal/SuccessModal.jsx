import Modal from ".";

const SuccessModal = ({ isSuccessModalOpen, closeSuccessModal }) => {
  return (
    <Modal isModalOpen={isSuccessModalOpen} closeModal={closeSuccessModal}>
      <div className="p-4">
        <h2 className="text-lg font-semibold">Broadcast Submitted</h2>
        <p>Your broadcast has been submitted successfully.</p>
        <button
          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
          onClick={closeSuccessModal}
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default SuccessModal;
