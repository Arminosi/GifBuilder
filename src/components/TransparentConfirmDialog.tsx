import React from 'react';
import type { TranslationSchema } from '../utils/translations';
import { ConfirmDialog } from './ConfirmDialog';

interface TransparentConfirmDialogProps {
  isOpen: boolean;
  isClosing: boolean;
  labels: TranslationSchema['transparentConfirm'];
  onKeep: () => void;
  onSwitch: () => void;
}

export const TransparentConfirmDialog: React.FC<TransparentConfirmDialogProps> = ({
  isOpen,
  isClosing,
  labels,
  onKeep,
  onSwitch,
}) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      isClosing={isClosing}
      title={labels.title}
      message={labels.message}
      cancelLabel={labels.keep}
      confirmLabel={labels.switch}
      onCancel={onKeep}
      onConfirm={onSwitch}
    />
  );
};
