import { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from './Modal';
import PixelButton from './PixelButton';

const AVATAR_COUNT = 10;

interface AvatarSelectModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatarId: number;
  onSelect: (avatarId: number) => void;
}

export function getAvatarUrl(avatarId: number): string {
  return `/avatars/avatar-${avatarId}.png`;
}

export default function AvatarSelectModal({ open, onClose, currentAvatarId, onSelect }: AvatarSelectModalProps) {
  const [selected, setSelected] = useState(currentAvatarId);

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose your avatar" wide>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((id) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelected(id)}
            className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
              selected === id
                ? 'border-white shadow-lg shadow-white/10'
                : 'border-white/[0.06] hover:border-white/20'
            }`}
          >
            <img
              src={getAvatarUrl(id)}
              alt={`Avatar ${id}`}
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
            {selected === id && (
              <motion.div
                layoutId="avatar-ring"
                className="absolute inset-0 rounded-xl ring-2 ring-white ring-offset-2 ring-offset-[#222222]"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
          </motion.button>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <PixelButton variant="secondary" type="button" onClick={onClose}>
          Cancel
        </PixelButton>
        <PixelButton onClick={handleConfirm}>
          Save
        </PixelButton>
      </div>
    </Modal>
  );
}
