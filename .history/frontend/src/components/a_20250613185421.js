import React from 'react';
// Import all modal and toast components
import MessageBox from './MessageBox.js';
import BrocodeMemeModal from './BrocodeMemeModal.js';
import RoastModal from './RoastModal.js';
import UnsolicitedAdviceToast from './UnsolicitedAdviceToast.js';
import AchievementToast from './AchievementToast.js';

// This component manages all modals and toasts
export default function OverlayManager({
  // MessageBox props
  systemMessage, systemMessageType, onCloseSystemMessage,
  // AchievementToast props
  unlockedAchievement, onCloseAchievement,
  // BrocodeMemeModal props
  isMemeModalOpen, onCloseMemeModal, memeData, isLoadingMeme, memeError,
  // RoastModal props
  isRoastModalOpen, onCloseRoastModal, roastText, isLoadingRoast, roastError,
  // UnsolicitedAdviceToast props
  unsolicitedAdvice, onCloseUnsolicitedAdvice,
}) {
  return (
    <>
      {systemMessage && (
        <MessageBox
          message={systemMessage}
          type={systemMessageType}
          onClose={onCloseSystemMessage}
        />
      )}

      {unlockedAchievement && (
        <AchievementToast
          achievement={unlockedAchievement}
          onClose={onCloseAchievement}
        />
      )}

      <BrocodeMemeModal
        isOpen={isMemeModalOpen}
        onClose={onCloseMemeModal}
        memeData={memeData}
        isLoading={isLoadingMeme}
        error={memeError}
      />

      <RoastModal
        isOpen={isRoastModalOpen}
        onClose={onCloseRoastModal}
        roastText={roastText}
        isLoading={isLoadingRoast}
        error={roastError}
      />

      {unsolicitedAdvice && (
          <UnsolicitedAdviceToast
              message={unsolicitedAdvice}
              onClose={onCloseUnsolicitedAdvice}
          />
      )}
    </>
  );
}