import React from "react"

const formatDate = (startDate) =>
  new Date(startDate).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const Card = ({card, size}) => (
  <li
    style={{
      background: "#fff",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
    }}
  >
    <img
      src={card.image}
      alt={`Tiles covered by ${card.name}`}
      width={size.width}
      height={size.height}
      loading="lazy"
      style={{display: "block", width: "100%", height: "auto"}}
    />
    <div style={{padding: "10px 12px"}}>
      <div style={{fontWeight: 600}}>{card.name}</div>
      <div style={{color: "#666", fontSize: 14, marginTop: 2}}>
        {formatDate(card.startDate)}
        {" · "}
        {(card.distance / 1000).toFixed(1)} km
        {card.added > 0 && ` · ${card.added} new tiles`}
      </div>
    </div>
  </li>
)

const Cards = ({pageContext: {cards, size}}) => (
  <main
    style={{
      fontFamily: "system-ui, sans-serif",
      background: "#f4f4f5",
      minHeight: "100vh",
      padding: 20,
    }}
  >
    <h1 style={{fontSize: 20, margin: "0 0 16px"}}>
      {cards.length} latest activities
    </h1>
    <ul
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${
          size.width / 2
        }px, 1fr))`,
        gap: 16,
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {cards.map((card) => (
        <Card key={card.id} card={card} size={size} />
      ))}
    </ul>
  </main>
)

export default Cards
