import React from 'react';
import './css/reusableFadeInComponent.css'

interface ReusableFadeInComponentProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ReusableFadeInComponent: React.FC<ReusableFadeInComponentProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) {
    return null;
  }

  // The 'modal-overlay' handles the full-screen position, blurring, and dimming.
  // We attach the onClose handler to the overlay so clicking outside closes the modal.
  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* The 'modal-content-container' handles the fade-in animation.
        e.stopPropagation() prevents the click from propagating to the overlay 
        and immediately closing the modal when clicking inside the card.
      */}
      <div 
        className="modal-content-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};