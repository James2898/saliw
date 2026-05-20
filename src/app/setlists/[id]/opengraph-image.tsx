import { ImageResponse } from "next/og";
import {
  getSetlistById,
  getSetlistWithSongs,
  getSetlistLineup,
} from "@/app/actions/setlistActions";
import { listMusicians } from "@/app/actions/musicianActions";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
  const { id } = await params;

  const [
    { data: setlist },
    { data: songsRaw },
    { data: lineupRaw },
    { data: musiciansRaw },
  ] = await Promise.all([
    getSetlistById({ id }),
    getSetlistWithSongs({ setlist_id: id }),
    getSetlistLineup({ setlist_id: id }),
    listMusicians(),
  ]);

  const name = setlist?.name ?? "Setlist";

  const formattedDate = setlist?.date
    ? (() => {
        const dt = new Date(setlist.date);
        return new Date(
          dt.getUTCFullYear(),
          dt.getUTCMonth(),
          dt.getUTCDate()
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      })()
    : null;

  const worshipLeaderName =
    musiciansRaw?.find((m) => m.id === setlist?.worship_leader_id)?.name ??
    null;

  const songs = (songsRaw ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .slice(0, 8);

  const lineup = (lineupRaw ?? []).map(
    (entry) => `${entry.musicians.name} · ${entry.instrument}`
  );

  return new ImageResponse(
    <div
      style={{
        backgroundColor: "#FDF8F3",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 72px",
        fontFamily: "serif",
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          backgroundColor: "#863bff",
        }}
      />

      {/* Saliw branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 36,
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#6B4F3A",
            letterSpacing: "0.04em",
          }}
        >
          Saliw
        </span>
        <span
          style={{ fontSize: 20, color: "#A07850", letterSpacing: "0.04em" }}
        >
          Worship Music Portal
        </span>
      </div>

      {/* Setlist title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "#2D1F1B",
          lineHeight: 1.1,
          letterSpacing: "-1px",
          marginBottom: 12,
        }}
      >
        {name}
      </div>

      {/* Date + Worship Leader */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 32,
          fontSize: 22,
          color: "#6B4F3A",
        }}
      >
        {formattedDate && <span>{formattedDate}</span>}
        {worshipLeaderName && (
          <>
            {formattedDate && <span style={{ color: "#A07850" }}>·</span>}
            <span>Leader: {worshipLeaderName}</span>
          </>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          width: 80,
          height: 3,
          backgroundColor: "#863bff",
          borderRadius: 2,
          marginBottom: 28,
        }}
      />

      <div style={{ display: "flex", gap: 48, flex: 1 }}>
        {/* Song list */}
        {songs.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 16,
                color: "#A07850",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Songs
            </div>
            {songs.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 22,
                  color: "#2D1F1B",
                }}
              >
                <span style={{ color: "#A07850", fontSize: 16, minWidth: 20 }}>
                  {i + 1}
                </span>
                <span>{s.songs.title}</span>
              </div>
            ))}
            {(songsRaw?.length ?? 0) > 8 && (
              <div style={{ fontSize: 18, color: "#A07850", marginTop: 4 }}>
                +{(songsRaw?.length ?? 0) - 8} more
              </div>
            )}
          </div>
        )}

        {/* Lineup */}
        {lineup.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 280,
            }}
          >
            <div
              style={{
                fontSize: 16,
                color: "#A07850",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Musicians
            </div>
            {lineup.slice(0, 8).map((entry, i) => (
              <div key={i} style={{ fontSize: 20, color: "#2D1F1B" }}>
                {entry}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom domain */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          right: 72,
          fontSize: 18,
          color: "#A07850",
        }}
      >
        saliw.vercel.app
      </div>
    </div>,
    { ...size }
  );
}
