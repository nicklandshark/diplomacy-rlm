export type ConnectionLamp = "green" | "amber" | "red";

export interface ConnectionIndicatorState {
  activeLamp: ConnectionLamp;
  stateChip: "LINK LOST" | "RECEIVING" | "STANDBY";
  stateChipClass: string;
  statusDetail: string;
}

export function getConnectionIndicator(
  connected: boolean,
  queueActive: boolean,
  liveStep?: string | null,
): ConnectionIndicatorState {
  if (!connected) {
    return {
      activeLamp: "red",
      stateChip: "LINK LOST",
      stateChipClass: "border-[#d48e8e]/45 bg-[#8a4a4a]/18 text-[#e7caca]",
      statusDetail: "Offline feed",
    };
  }

  if (queueActive) {
    return {
      activeLamp: "amber",
      stateChip: "RECEIVING",
      stateChipClass: "border-[#d8bf6f]/45 bg-[#7a6940]/22 text-[#efe2bb]",
      statusDetail: liveStep || "Receiving transmissions",
    };
  }

  return {
    activeLamp: "green",
    stateChip: "STANDBY",
    stateChipClass: "border-[#7cbf95]/45 bg-[#4a7c59]/18 text-[#d6e6d8]",
    statusDetail: "Circuit open - standby",
  };
}
