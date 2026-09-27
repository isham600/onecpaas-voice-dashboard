import Modal from "../../Modal";
import { MODULE_TYPES } from "./moduleTypes";

const ModuleListModal = ({ open, onClose, onSelect }) => (
  <Modal isModalOpen={open} closeModal={onClose} width="max-w-2xl" height="auto" title="List Of Module">
    <div className="grid grid-cols-3 gap-4">
      {MODULE_TYPES.map((module) => {
        const Icon = module.icon;
        return (
          <button
            key={module.type}
            type="button"
            onClick={() => onSelect(module.type)}
            className="flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <Icon style={{ fontSize: 26, color: module.color }} />
            <span className="text-sm text-gray-700 text-center leading-tight">{module.label}</span>
          </button>
        );
      })}
    </div>
  </Modal>
);

export default ModuleListModal;
