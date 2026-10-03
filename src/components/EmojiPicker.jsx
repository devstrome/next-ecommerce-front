'use client'
import React from "react";

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡', '🙏', '🎉'];

const EmojiPicker = ({ onSelect, onClose }) => {
  return (
    <div
      className="bg-white border border-gray-200 shadow-lg rounded-xl p-1.5 flex gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="w-7 h-7 flex items-center justify-center text-base hover:bg-gray-100 rounded-full transition-colors active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;
