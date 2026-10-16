export const CALENDAR_TIME_ZONE = "America/Edmonton";
export const CATEGORIES = {
  market: {
    label: "BBG Market visits",
    singular: "BBG Market visit",
    color: "#ad7053",
    background: "#faeee6",
    icon: "↗",
    description: "Plan customer meetings and market trips across Canada.",
  },
  distillery: {
    label: "Casa Salles Visits",
    singular: "Casa Salles Visit",
    color: "#438376",
    background: "#e8f2ed",
    icon: "◈",
    description: "Keep Canadian visitor dates and agenda links together.",
  },
  event: {
    label: "Events in Canada",
    singular: "Event in Canada",
    color: "#8270ae",
    background: "#f0ecf8",
    icon: "✦",
    description: "Coordinate activations and events across Canada.",
  },
  tender: {
    label: "Provincial tender calls",
    singular: "Provincial tender call",
    color: "#537da4",
    background: "#eaf1f8",
    icon: "▤",
    description: "Track both tender deadlines, organized by destination.",
  },
} as const;
export type Category = keyof typeof CATEGORIES;
export const PROVINCES: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};
export const TIMEZONES = [
  "America/Edmonton",
  "America/Vancouver",
  "America/Winnipeg",
  "America/Toronto",
  "America/Halifax",
  "America/St_Johns",
  "America/Regina",
  "America/Whitehorse",
  "America/Mexico_City",
];
