import React from "react"

export const PlaybackBar = ({
  index,
  max,
  isPlaying,
  onTogglePlay,
  onIndexChange,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px",
      background: "rgba(255, 255, 255, 0.8)",
    }}
  >
    <button
      onClick={() => onIndexChange(Math.max(0, index - 1))}
      disabled={index === 0}
    >
      ⏪️
    </button>
    <button onClick={onTogglePlay}>{isPlaying ? "⏸️" : "▶️"}</button>
    <button
      onClick={() => onIndexChange(Math.min(max, index + 1))}
      disabled={index === max}
    >
      ⏩️
    </button>
    <input
      type="range"
      min={0}
      max={max}
      step={1}
      value={index}
      onChange={(event) => onIndexChange(Number(event.target.value))}
      style={{flex: 1}}
    />
    {children}
  </div>
)
