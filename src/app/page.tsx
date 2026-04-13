export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        fontFamily: "var(--font-plus-jakarta-sans, sans-serif)",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          color: "var(--brand-espresso)",
        }}
      >
        Saliw
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--brand-tan)",
        }}
      >
        Foundation scaffold — Next.js 15 App Router
      </p>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginTop: "1.5rem",
        }}
      >
        {(
          [
            ["--brand-cream", "#FDF8F3"],
            ["--brand-tan", "#BC8E5C"],
            ["--brand-brown", "#835B43"],
            ["--brand-espresso", "#2D1F1B"],
            ["--brand-darker", "#1A1210"],
          ] as [string, string][]
        ).map(([name, hex]) => (
          <div
            key={name}
            title={`${name}: ${hex}`}
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "0.5rem",
              backgroundColor: `var(${name})`,
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          />
        ))}
      </div>
    </main>
  );
}
