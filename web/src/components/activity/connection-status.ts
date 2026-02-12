export type ConnectionSignal = "online" | "reconnecting" | "offline";
export type ConnectionLamp = "green" | "amber" | "red";

export interface ConnectionDisplayState {
  feedLabel: string;
  statusToneClass: string;
  activeLamp: ConnectionLamp;
  rockerState: "ON" | "OFF";
}

export function resolveConnectionSignal(
  connected: boolean,
  error?: string | null,
): ConnectionSignal {
  if (connected) return "online";
  if ((error || "").toLowerCase().includes("reconnect")) return "reconnecting";
  return "offline";
}

export function getConnectionDisplayState(
  signal: ConnectionSignal,
): ConnectionDisplayState {
  switch (signal) {
    case "online":
      return {
        feedLabel: "Live feed",
        statusToneClass: "text-emerald-300",
        activeLamp: "green",
        rockerState: "ON",
      };
    case "reconnecting":
      return {
        feedLabel: "Reconnecting",
        statusToneClass: "text-amber-300",
        activeLamp: "amber",
        rockerState: "ON",
      };
    case "offline":
    default:
      return {
        feedLabel: "Offline feed",
        statusToneClass: "text-rose-300/90",
        activeLamp: "red",
        rockerState: "OFF",
      };
  }
}
