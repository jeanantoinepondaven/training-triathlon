export const HOME_COOKIE = "home_hidden";
export const HOME_MODULES = [
  { id: "race", label: "Goal race countdown" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week, by sport" },
  { id: "races", label: "Races" },
  { id: "targets", label: "Targets" },
  { id: "load", label: "Training load" },
  { id: "season", label: "Season calendar" },
  { id: "partner", label: "Partner" },
  { id: "highlight", label: "Highlight" },
] as const;
export type HomeModule = (typeof HOME_MODULES)[number]["id"];
