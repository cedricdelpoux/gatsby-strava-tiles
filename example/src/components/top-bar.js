import React, {useState} from "react"

export const BAR_HEIGHT = 44

export const Stat = ({color, value, label}) => (
  <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
    {color && (
      <span
        style={{
          width: "10px",
          height: "10px",
          background: color,
          border: "1px solid rgba(0, 0, 0, 0.2)",
          borderRadius: "2px",
        }}
      />
    )}
    <strong>{value}</strong>
    <span style={{color: "#6b7280"}}>{label}</span>
  </div>
)

const Toggle = ({label, checked, onChange}) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    {label}
  </label>
)

const Settings = ({settings, onChange}) => (
  <div
    style={{
      position: "absolute",
      top: "100%",
      right: "8px",
      zIndex: 1,
      width: "230px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "12px",
      background: "#ffffff",
      borderRadius: "6px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
    }}
  >
    <Toggle
      label="Outlines"
      checked={settings.outlined}
      onChange={(outlined) => onChange({outlined})}
    />
    <Toggle
      label="Max square"
      checked={settings.square}
      onChange={(square) => onChange({square})}
    />
    <Toggle
      label="Cluster"
      checked={settings.cluster}
      onChange={(cluster) => onChange({cluster})}
    />
    <Toggle
      label="Max row & column"
      checked={settings.lines}
      onChange={(lines) => onChange({lines})}
    />
    <Toggle
      label="Activities"
      checked={settings.activities}
      onChange={(activities) => onChange({activities})}
    />
  </div>
)

// A white bar over the map: the numbers on the left, the settings panel behind
// the button on the right
export const TopBar = ({settings, onSettingsChange, children}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      style={{
        position: "relative",
        flex: "none",
        height: `${BAR_HEIGHT}px`,
        display: "flex",
        alignItems: "center",
        gap: "20px",
        padding: "0 16px",
        background: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
      }}
    >
      {children}
      <div style={{flex: 1}} />
      <button
        onClick={() => setIsOpen((open) => !open)}
        style={{
          padding: "4px 8px",
          cursor: "pointer",
          border: "1px solid #d1d5db",
          borderRadius: "4px",
          background: isOpen ? "#f3f4f6" : "#ffffff",
        }}
      >
        ⚙️ Settings
      </button>
      {isOpen && <Settings settings={settings} onChange={onSettingsChange} />}
    </div>
  )
}
