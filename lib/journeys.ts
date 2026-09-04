import type { NativeComponent } from './composition';

export type JourneyMode = 'rail' | 'flight';
export type JourneyOrigin = 'shoreditch' | 'camden' | 'canary_wharf';
export type JourneyDestination = 'jordaan' | 'de_pijp' | 'museum_quarter';
export type JourneyMetricId =
  | 'door_to_door_time'
  | 'walking_distance'
  | 'disruption_risk'
  | 'arrival_slack'
  | 'fare'
  | 'carbon'
  | 'advertised_duration';
export const journeyCalculationMetricIds = [
  'door_to_door_time',
  'arrival_time',
  'walking_distance',
  'disruption_risk',
  'arrival_slack',
] as const;
export type JourneyCalculationMetricId =
  (typeof journeyCalculationMetricIds)[number];
export type JourneyCalculationComponent = {
  id: string;
  label: string;
  formattedValue: string;
  minutes?: number;
  minuteOfDay?: number;
  kilometres?: number;
  percentagePoints?: number;
};
export type JourneyCalculationExplanation = {
  metric: JourneyCalculationMetricId;
  result: number;
  formattedResult: string;
  components: JourneyCalculationComponent[];
  arithmetic: string;
  exclusions: string[];
};
export type JourneyRequirementId =
  | 'arrive_by'
  | 'minimum_connection_slack'
  | 'step_free'
  | 'direct_only';

export type JourneyLeg = {
  label: string;
  from: string;
  to: string;
  mode: 'walk' | 'taxi' | 'train' | 'flight' | 'metro';
  minutes: number;
};

export type Journey = {
  id: string;
  operator: string;
  service: string;
  mode: JourneyMode;
  departureTerminal: string;
  arrivalTerminal: string;
  departureMinute: number;
  advertisedMinutes: number;
  connectionMinutes: number;
  connectionSlackMinutes: number | null;
  originAccessMinutes: Record<JourneyOrigin, number>;
  terminalBufferMinutes: number;
  checkedBagMinutes: number;
  arrivalProcessMinutes: number;
  destinationTransferMinutes: Record<JourneyDestination, number>;
  walkingKm: number;
  fare: number;
  carbonKg: number;
  baseRiskPercent: number;
  bagRiskDelta: number;
  punctualityBand: string;
  direct: boolean;
  stepFree: boolean;
  accessibility: string[];
  luggageRule: string;
  legs: JourneyLeg[];
};

export type JourneyAssumptions = {
  origin: JourneyOrigin;
  destination: JourneyDestination;
  checked_bag: boolean;
  arrival_deadline_minutes: number;
  minimum_connection_slack_minutes: number;
  reliability_weight: number;
};

export type JourneyView = {
  title: string;
  assumptions: JourneyAssumptions;
  requirements: JourneyRequirementId[];
  visibleMetricIds: JourneyMetricId[];
  primarySort: { metricId: JourneyMetricId; direction: 'asc' | 'desc' };
  composition: NativeComponent[];
};

export type JourneyEvaluation = {
  journey: Journey;
  totalMinutes: number;
  arrivalMinute: number;
  walkingKm: number;
  riskPercent: number;
  arrivalSlackMinutes: number;
  eligible: boolean;
  reasons: string[];
  score: number;
  rank: number;
};

export const journeyOrigins: Record<JourneyOrigin, string> = {
  shoreditch: 'Shoreditch, London',
  camden: 'Camden Town, London',
  canary_wharf: 'Canary Wharf, London',
};

export const journeyDestinations: Record<JourneyDestination, string> = {
  jordaan: 'the Jordaan, Amsterdam',
  de_pijp: 'De Pijp, Amsterdam',
  museum_quarter: 'Museum Quarter, Amsterdam',
};

// Every itinerary travels from London time to Amsterdam time in this demo.
export const arrivalTimeZoneOffsetMinutes = 60;

export function journeyViewTitle(assumptions: JourneyAssumptions) {
  const destination = {
    jordaan: 'the Jordaan',
    de_pijp: 'De Pijp',
    museum_quarter: 'Museum Quarter',
  }[assumptions.destination];
  const hour24 = Math.floor(assumptions.arrival_deadline_minutes / 60) % 24;
  const minute = assumptions.arrival_deadline_minutes % 60;
  const hour12 = hour24 % 12 || 12;
  const clock = `${hour12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${hour24 >= 12 ? 'pm' : 'am'}`;
  return `Journeys that get you to ${destination} by ${clock}.`;
}

const j = (
  id: string,
  operator: string,
  service: string,
  mode: JourneyMode,
  departureTerminal: string,
  arrivalTerminal: string,
  departureMinute: number,
  advertisedMinutes: number,
  originAccess: [number, number, number],
  terminalBufferMinutes: number,
  checkedBagMinutes: number,
  arrivalProcessMinutes: number,
  destinationTransfer: [number, number, number],
  walkingKm: number,
  fare: number,
  carbonKg: number,
  baseRiskPercent: number,
  bagRiskDelta: number,
  punctualityBand: string,
  direct: boolean,
  stepFree: boolean,
  connectionMinutes: number,
  connectionSlackMinutes: number | null,
  luggageRule: string,
  legs: JourneyLeg[],
): Journey => ({
  id,
  operator,
  service,
  mode,
  departureTerminal,
  arrivalTerminal,
  departureMinute,
  advertisedMinutes,
  originAccessMinutes: {
    shoreditch: originAccess[0],
    camden: originAccess[1],
    canary_wharf: originAccess[2],
  },
  terminalBufferMinutes,
  checkedBagMinutes,
  arrivalProcessMinutes,
  destinationTransferMinutes: {
    jordaan: destinationTransfer[0],
    de_pijp: destinationTransfer[1],
    museum_quarter: destinationTransfer[2],
  },
  walkingKm,
  fare,
  carbonKg,
  baseRiskPercent,
  bagRiskDelta,
  punctualityBand,
  direct,
  stepFree,
  connectionMinutes,
  connectionSlackMinutes,
  luggageRule,
  legs,
  accessibility: stepFree
    ? ['Step-free boarding', 'Assistance bookable', 'Accessible toilet']
    : ['Assistance bookable'],
});

export const journeys: Journey[] = [
  j(
    'wl-rail-0716',
    'Northstar Rail',
    'NR 914',
    'rail',
    'St Pancras International',
    'Amsterdam Centraal',
    436,
    208,
    [18, 22, 31],
    34,
    0,
    8,
    [13, 21, 24],
    0.8,
    118,
    8,
    6,
    0,
    'Usually within 10 minutes',
    true,
    true,
    0,
    null,
    'Two bags included',
    [
      {
        label: 'Overground',
        from: 'Shoreditch',
        to: 'St Pancras',
        mode: 'train',
        minutes: 18,
      },
      {
        label: 'Northstar NR 914',
        from: 'St Pancras',
        to: 'Amsterdam Centraal',
        mode: 'train',
        minutes: 208,
      },
      {
        label: 'Tram + walk',
        from: 'Centraal',
        to: 'Jordaan',
        mode: 'metro',
        minutes: 13,
      },
    ],
  ),
  j(
    'wl-rail-0901',
    'Northstar Rail',
    'NR 926',
    'rail',
    'St Pancras International',
    'Amsterdam Centraal',
    541,
    215,
    [18, 22, 31],
    36,
    0,
    8,
    [14, 21, 24],
    0.7,
    104,
    8,
    7,
    0,
    'Usually within 10 minutes',
    true,
    true,
    0,
    null,
    'Two bags included',
    [
      {
        label: 'Overground',
        from: 'Shoreditch',
        to: 'St Pancras',
        mode: 'train',
        minutes: 18,
      },
      {
        label: 'Northstar NR 926',
        from: 'St Pancras',
        to: 'Amsterdam Centraal',
        mode: 'train',
        minutes: 215,
      },
      {
        label: 'Tram + walk',
        from: 'Centraal',
        to: 'Jordaan',
        mode: 'metro',
        minutes: 14,
      },
    ],
  ),
  j(
    'wl-rail-1104',
    'Northstar Rail',
    'NR 942',
    'rail',
    'St Pancras International',
    'Amsterdam Centraal',
    664,
    220,
    [18, 22, 31],
    38,
    0,
    9,
    [14, 21, 24],
    0.7,
    92,
    8,
    8,
    0,
    'Usually within 15 minutes',
    true,
    true,
    0,
    null,
    'Two bags included',
    [
      {
        label: 'Overground',
        from: 'Shoreditch',
        to: 'St Pancras',
        mode: 'train',
        minutes: 18,
      },
      {
        label: 'Northstar NR 942',
        from: 'St Pancras',
        to: 'Amsterdam Centraal',
        mode: 'train',
        minutes: 220,
      },
      {
        label: 'Tram + walk',
        from: 'Centraal',
        to: 'Jordaan',
        mode: 'metro',
        minutes: 14,
      },
    ],
  ),
  j(
    'wl-flight-1200',
    'AeroSwift',
    'AS 104',
    'flight',
    'London City',
    'Schiphol',
    720,
    70,
    [35, 58, 24],
    85,
    30,
    15,
    [31, 34, 28],
    1.5,
    89,
    96,
    14,
    3,
    'Usually within 25 minutes',
    true,
    true,
    0,
    null,
    'Cabin bag included · checked bag £24',
    [
      {
        label: 'DLR',
        from: 'Shoreditch',
        to: 'London City',
        mode: 'train',
        minutes: 35,
      },
      {
        label: 'AeroSwift AS 104',
        from: 'London City',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 70,
      },
      {
        label: 'Train + walk',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 31,
      },
    ],
  ),
  j(
    'wl-flight-1315',
    'CanalJet',
    'CJ 218',
    'flight',
    'London City',
    'Schiphol',
    795,
    75,
    [35, 58, 24],
    65,
    20,
    15,
    [31, 34, 28],
    1.2,
    124,
    94,
    8,
    2,
    'Usually within 15 minutes',
    true,
    true,
    0,
    null,
    'Cabin and checked bag included',
    [
      {
        label: 'DLR',
        from: 'Shoreditch',
        to: 'London City',
        mode: 'train',
        minutes: 35,
      },
      {
        label: 'CanalJet CJ 218',
        from: 'London City',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 75,
      },
      {
        label: 'Train + walk',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 31,
      },
    ],
  ),
  j(
    'wl-flight-1240',
    'Meridian Air',
    'MA 640',
    'flight',
    'Heathrow T5',
    'Schiphol',
    760,
    80,
    [56, 49, 67],
    76,
    25,
    17,
    [44, 40, 37],
    1.8,
    109,
    128,
    10,
    2,
    'Usually within 20 minutes',
    true,
    true,
    0,
    null,
    'Checked bag included',
    [
      {
        label: 'Elizabeth line',
        from: 'Shoreditch',
        to: 'Heathrow',
        mode: 'train',
        minutes: 56,
      },
      {
        label: 'Meridian MA 640',
        from: 'Heathrow',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 80,
      },
      {
        label: 'Train + tram',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 44,
      },
    ],
  ),
  j(
    'wl-flight-1320',
    'Lowland Air',
    'LA 332',
    'flight',
    'Gatwick South',
    'Schiphol',
    800,
    78,
    [55, 58, 68],
    82,
    25,
    17,
    [43, 39, 36],
    2.1,
    72,
    119,
    17,
    4,
    'Often 15–30 minutes late',
    true,
    false,
    0,
    null,
    'Small cabin bag · checked bag £28',
    [
      {
        label: 'Rail',
        from: 'Shoreditch',
        to: 'Gatwick',
        mode: 'train',
        minutes: 55,
      },
      {
        label: 'Lowland LA 332',
        from: 'Gatwick',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 78,
      },
      {
        label: 'Train + walk',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 43,
      },
    ],
  ),
  j(
    'wl-flight-1410',
    'AeroSwift',
    'AS 118',
    'flight',
    'London City',
    'Schiphol',
    956,
    72,
    [35, 58, 24],
    70,
    30,
    15,
    [31, 34, 28],
    1.5,
    96,
    96,
    13,
    3,
    'Usually within 25 minutes',
    true,
    true,
    0,
    null,
    'Cabin bag included · checked bag £24',
    [
      {
        label: 'DLR',
        from: 'Shoreditch',
        to: 'London City',
        mode: 'train',
        minutes: 35,
      },
      {
        label: 'AeroSwift AS 118',
        from: 'London City',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 72,
      },
      {
        label: 'Train + walk',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 31,
      },
    ],
  ),
  j(
    'wl-flight-1435',
    'Skylark Europe',
    'SE 440',
    'flight',
    'Heathrow T2',
    'Schiphol',
    928,
    84,
    [58, 51, 69],
    80,
    27,
    18,
    [44, 40, 37],
    1.9,
    98,
    132,
    12,
    3,
    'Usually within 20 minutes',
    true,
    true,
    0,
    null,
    'Cabin bag included · checked bag £22',
    [
      {
        label: 'Elizabeth line',
        from: 'Shoreditch',
        to: 'Heathrow',
        mode: 'train',
        minutes: 58,
      },
      {
        label: 'Skylark SE 440',
        from: 'Heathrow',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 84,
      },
      {
        label: 'Train + tram',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 44,
      },
    ],
  ),
  j(
    'wl-flight-1450',
    'North Fen Air',
    'NF 806',
    'flight',
    'Stansted',
    'Schiphol',
    935,
    80,
    [68, 72, 54],
    78,
    28,
    17,
    [43, 39, 36],
    2.4,
    59,
    114,
    19,
    4,
    'Often 20–35 minutes late',
    true,
    false,
    0,
    null,
    'Small cabin bag · checked bag £31',
    [
      {
        label: 'Coach',
        from: 'Shoreditch',
        to: 'Stansted',
        mode: 'taxi',
        minutes: 68,
      },
      {
        label: 'North Fen NF 806',
        from: 'Stansted',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 80,
      },
      {
        label: 'Train + walk',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 43,
      },
    ],
  ),
  j(
    'wl-connect-1010',
    'ViaNord',
    'VN 304',
    'flight',
    'Heathrow T2',
    'Rotterdam via Brussels',
    800,
    190,
    [58, 51, 69],
    78,
    30,
    16,
    [52, 45, 41],
    2.6,
    83,
    142,
    20,
    4,
    'Connection at risk after small delays',
    false,
    true,
    48,
    22,
    'Checked bag through-tagged',
    [
      {
        label: 'Elizabeth line',
        from: 'Shoreditch',
        to: 'Heathrow',
        mode: 'train',
        minutes: 58,
      },
      {
        label: 'ViaNord',
        from: 'Heathrow',
        to: 'Brussels',
        mode: 'flight',
        minutes: 72,
      },
      {
        label: 'Connection',
        from: 'Brussels',
        to: 'Brussels',
        mode: 'walk',
        minutes: 48,
      },
      {
        label: 'Intercity',
        from: 'Brussels',
        to: 'Amsterdam',
        mode: 'train',
        minutes: 70,
      },
    ],
  ),
  j(
    'wl-connect-1130',
    'CanalJet',
    'CJ 510',
    'flight',
    'Gatwick North',
    'Schiphol via Paris',
    800,
    205,
    [57, 60, 70],
    82,
    32,
    18,
    [43, 39, 36],
    2.8,
    77,
    151,
    24,
    5,
    'Tight connection in one run of five',
    false,
    false,
    55,
    18,
    'Checked bag through-tagged',
    [
      {
        label: 'Rail',
        from: 'Shoreditch',
        to: 'Gatwick',
        mode: 'train',
        minutes: 57,
      },
      {
        label: 'CanalJet',
        from: 'Gatwick',
        to: 'Paris',
        mode: 'flight',
        minutes: 75,
      },
      {
        label: 'Connection',
        from: 'Paris',
        to: 'Paris',
        mode: 'walk',
        minutes: 55,
      },
      {
        label: 'CanalJet',
        from: 'Paris',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 75,
      },
    ],
  ),
  j(
    'wl-connect-1230',
    'Baltic Link',
    'BL 228',
    'flight',
    'Stansted',
    'Schiphol via Hamburg',
    780,
    225,
    [68, 72, 54],
    76,
    28,
    17,
    [43, 39, 36],
    2.9,
    65,
    168,
    22,
    4,
    'Usually within 30 minutes',
    false,
    false,
    62,
    29,
    'Checked bag through-tagged',
    [
      {
        label: 'Coach',
        from: 'Shoreditch',
        to: 'Stansted',
        mode: 'taxi',
        minutes: 68,
      },
      {
        label: 'Baltic Link',
        from: 'Stansted',
        to: 'Hamburg',
        mode: 'flight',
        minutes: 80,
      },
      {
        label: 'Connection',
        from: 'Hamburg',
        to: 'Hamburg',
        mode: 'walk',
        minutes: 62,
      },
      {
        label: 'Baltic Link',
        from: 'Hamburg',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 83,
      },
    ],
  ),
  j(
    'wl-rail-1302',
    'Northstar Rail',
    'NR 958',
    'rail',
    'St Pancras International',
    'Amsterdam Centraal',
    850,
    218,
    [18, 22, 31],
    38,
    0,
    9,
    [14, 21, 24],
    0.7,
    86,
    8,
    8,
    0,
    'Usually within 15 minutes',
    true,
    true,
    0,
    null,
    'Two bags included',
    [
      {
        label: 'Overground',
        from: 'Shoreditch',
        to: 'St Pancras',
        mode: 'train',
        minutes: 18,
      },
      {
        label: 'Northstar NR 958',
        from: 'St Pancras',
        to: 'Amsterdam Centraal',
        mode: 'train',
        minutes: 218,
      },
      {
        label: 'Tram + walk',
        from: 'Centraal',
        to: 'Jordaan',
        mode: 'metro',
        minutes: 14,
      },
    ],
  ),
  j(
    'wl-flight-1545',
    'Meridian Air',
    'MA 672',
    'flight',
    'Heathrow T5',
    'Schiphol',
    945,
    82,
    [56, 49, 67],
    76,
    25,
    17,
    [44, 40, 37],
    1.8,
    88,
    128,
    11,
    2,
    'Usually within 20 minutes',
    true,
    true,
    0,
    null,
    'Checked bag included',
    [
      {
        label: 'Elizabeth line',
        from: 'Shoreditch',
        to: 'Heathrow',
        mode: 'train',
        minutes: 56,
      },
      {
        label: 'Meridian MA 672',
        from: 'Heathrow',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 82,
      },
      {
        label: 'Train + tram',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 44,
      },
    ],
  ),
  j(
    'wl-flight-1610',
    'Lowland Air',
    'LA 346',
    'flight',
    'Gatwick South',
    'Schiphol',
    970,
    79,
    [55, 58, 68],
    82,
    25,
    17,
    [43, 39, 36],
    2.1,
    68,
    119,
    18,
    4,
    'Often 15–30 minutes late',
    true,
    false,
    0,
    null,
    'Small cabin bag · checked bag £28',
    [
      {
        label: 'Rail',
        from: 'Shoreditch',
        to: 'Gatwick',
        mode: 'train',
        minutes: 55,
      },
      {
        label: 'Lowland LA 346',
        from: 'Gatwick',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 79,
      },
      {
        label: 'Train + walk',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 43,
      },
    ],
  ),
  j(
    'wl-flight-1705',
    'North Fen Air',
    'NF 818',
    'flight',
    'Stansted',
    'Schiphol',
    1025,
    82,
    [68, 72, 54],
    78,
    28,
    17,
    [43, 39, 36],
    2.4,
    54,
    114,
    20,
    4,
    'Often 20–35 minutes late',
    true,
    false,
    0,
    null,
    'Small cabin bag · checked bag £31',
    [
      {
        label: 'Coach',
        from: 'Shoreditch',
        to: 'Stansted',
        mode: 'taxi',
        minutes: 68,
      },
      {
        label: 'North Fen NF 818',
        from: 'Stansted',
        to: 'Schiphol',
        mode: 'flight',
        minutes: 82,
      },
      {
        label: 'Train + walk',
        from: 'Schiphol',
        to: 'Jordaan',
        mode: 'train',
        minutes: 43,
      },
    ],
  ),
  j(
    'wl-connect-1440',
    'ViaNord',
    'VN 328',
    'flight',
    'London City',
    'Amsterdam via Antwerp',
    880,
    178,
    [35, 58, 24],
    68,
    25,
    15,
    [24, 30, 31],
    2.2,
    91,
    112,
    18,
    4,
    'Connection protected, usually within 25 minutes',
    false,
    true,
    42,
    34,
    'Checked bag through-tagged',
    [
      {
        label: 'DLR',
        from: 'Shoreditch',
        to: 'London City',
        mode: 'train',
        minutes: 35,
      },
      {
        label: 'ViaNord',
        from: 'London City',
        to: 'Antwerp',
        mode: 'flight',
        minutes: 70,
      },
      {
        label: 'Connection',
        from: 'Antwerp',
        to: 'Antwerp',
        mode: 'walk',
        minutes: 42,
      },
      {
        label: 'Intercity',
        from: 'Antwerp',
        to: 'Amsterdam',
        mode: 'train',
        minutes: 66,
      },
    ],
  ),
];

export const journeyById = new Map(
  journeys.map((journey) => [journey.id, journey]),
);

export const defaultJourneyView: JourneyView = {
  title: journeyViewTitle({
    origin: 'shoreditch',
    destination: 'jordaan',
    checked_bag: true,
    arrival_deadline_minutes: 19 * 60,
    minimum_connection_slack_minutes: 20,
    reliability_weight: 0.67,
  }),
  assumptions: {
    origin: 'shoreditch',
    destination: 'jordaan',
    checked_bag: true,
    arrival_deadline_minutes: 19 * 60,
    minimum_connection_slack_minutes: 20,
    reliability_weight: 0.67,
  },
  requirements: ['arrive_by'],
  visibleMetricIds: [
    'door_to_door_time',
    'walking_distance',
    'disruption_risk',
    'arrival_slack',
    'fare',
    'carbon',
  ],
  primarySort: { metricId: 'door_to_door_time', direction: 'asc' },
  composition: [
    { id: 'summary', type: 'decision_summary' },
    { id: 'inputs', type: 'assumptions' },
    { id: 'plot', type: 'scatter_plot' },
    { id: 'results', type: 'ranked_cards' },
    { id: 'comparison', type: 'comparison' },
    { id: 'exclusions', type: 'exclusions' },
  ],
};

export function formatClock(minutes: number) {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function formatDuration(minutes: number) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours ? `${hours}h ${String(mins).padStart(2, '0')}m` : `${mins}m`;
}

function destinationWalkAdjustment(destination: JourneyDestination) {
  if (destination === 'de_pijp') return 0.3;
  if (destination === 'museum_quarter') return 0.2;
  return 0;
}

function rawEvaluation(journey: Journey, config: JourneyView) {
  const assumptions = config.assumptions;
  const totalMinutes =
    journey.originAccessMinutes[assumptions.origin] +
    journey.terminalBufferMinutes +
    journey.advertisedMinutes +
    journey.arrivalProcessMinutes +
    (assumptions.checked_bag ? journey.checkedBagMinutes : 0) +
    journey.destinationTransferMinutes[assumptions.destination];
  const arrivalMinute =
    journey.departureMinute +
    journey.advertisedMinutes +
    journey.arrivalProcessMinutes +
    (assumptions.checked_bag ? journey.checkedBagMinutes : 0) +
    journey.destinationTransferMinutes[assumptions.destination] +
    arrivalTimeZoneOffsetMinutes;
  const destinationWalkDelta = destinationWalkAdjustment(
    assumptions.destination,
  );
  const walkingKm = journey.walkingKm + destinationWalkDelta;
  const connectionPenalty =
    journey.connectionSlackMinutes == null
      ? 0
      : Math.max(0, 40 - journey.connectionSlackMinutes) * 0.25;
  const riskPercent = Math.min(
    45,
    journey.baseRiskPercent +
      connectionPenalty +
      (assumptions.checked_bag ? journey.bagRiskDelta : 0),
  );
  const arrivalSlackMinutes =
    assumptions.arrival_deadline_minutes - arrivalMinute;
  const reasons: string[] = [];
  if (config.requirements.includes('arrive_by') && arrivalSlackMinutes < 0)
    reasons.push(
      `Arrives ${Math.abs(Math.round(arrivalSlackMinutes))} minutes late`,
    );
  if (
    config.requirements.includes('minimum_connection_slack') &&
    journey.connectionSlackMinutes != null &&
    journey.connectionSlackMinutes <
      assumptions.minimum_connection_slack_minutes
  )
    reasons.push(
      `Connection buffer is ${assumptions.minimum_connection_slack_minutes - journey.connectionSlackMinutes} minutes below your minimum`,
    );
  if (config.requirements.includes('step_free') && !journey.stepFree)
    reasons.push('Not step-free throughout');
  if (config.requirements.includes('direct_only') && !journey.direct)
    reasons.push('Includes a connection');
  return {
    journey,
    totalMinutes,
    arrivalMinute,
    walkingKm,
    riskPercent,
    arrivalSlackMinutes,
    eligible: reasons.length === 0,
    reasons,
  };
}

export function evaluateJourneys(
  config: JourneyView,
  hiddenIds: string[] = [],
): {
  all: JourneyEvaluation[];
  ranked: JourneyEvaluation[];
  excluded: JourneyEvaluation[];
} {
  const visible = journeys.filter((journey) => !hiddenIds.includes(journey.id));
  const raw = visible.map((journey) => rawEvaluation(journey, config));
  const eligibleRaw = raw.filter((row) => row.eligible);
  const minMax = (values: number[]) =>
    [Math.min(...values), Math.max(...values)] as const;
  const [timeMin, timeMax] = minMax(eligibleRaw.map((row) => row.totalMinutes));
  const [riskMin, riskMax] = minMax(eligibleRaw.map((row) => row.riskPercent));
  const [walkMin, walkMax] = minMax(eligibleRaw.map((row) => row.walkingKm));
  const normalize = (value: number, min: number, max: number) =>
    max === min ? 0 : (value - min) / (max - min);
  const weighted = raw.map((row) => {
    const reliability = config.assumptions.reliability_weight;
    const speed = 1 - reliability;
    const score =
      normalize(row.totalMinutes, timeMin, timeMax) * speed * 0.8 +
      normalize(row.riskPercent, riskMin, riskMax) * reliability +
      normalize(row.walkingKm, walkMin, walkMax) * 0.2;
    return { ...row, score: Number.isFinite(score) ? score : 0, rank: 0 };
  });
  const metricValue = (row: JourneyEvaluation, id: JourneyMetricId) => {
    if (id === 'door_to_door_time') return row.totalMinutes;
    if (id === 'walking_distance') return row.walkingKm;
    if (id === 'disruption_risk') return row.riskPercent;
    if (id === 'arrival_slack') return row.arrivalSlackMinutes;
    if (id === 'fare') return row.journey.fare;
    if (id === 'carbon') return row.journey.carbonKg;
    return row.journey.advertisedMinutes;
  };
  const ranked = weighted
    .filter((row) => row.eligible)
    .sort((a, b) => {
      if (config.assumptions.reliability_weight > 0)
        return a.score - b.score || a.totalMinutes - b.totalMinutes;
      const direction = config.primarySort.direction === 'asc' ? 1 : -1;
      return (
        (metricValue(a, config.primarySort.metricId) -
          metricValue(b, config.primarySort.metricId)) *
        direction
      );
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
  const rankedById = new Map(ranked.map((row) => [row.journey.id, row]));
  const all = weighted.map((row) => rankedById.get(row.journey.id) ?? row);
  return {
    all,
    ranked,
    excluded: all
      .filter((row) => !row.eligible)
      .sort((a, b) => a.arrivalMinute - b.arrivalMinute),
  };
}

export function explainJourney(
  journey: Journey,
  config: JourneyView,
  metric: JourneyCalculationMetricId,
): JourneyCalculationExplanation {
  const row = rawEvaluation(journey, config);
  if (metric === 'door_to_door_time') {
    const components: JourneyCalculationComponent[] = [
      {
        id: 'origin_access',
        label: `${journeyOrigins[config.assumptions.origin]} to ${journey.departureTerminal}`,
        minutes: journey.originAccessMinutes[config.assumptions.origin],
        formattedValue: `${journey.originAccessMinutes[config.assumptions.origin]} min`,
      },
      {
        id: 'recommended_buffer',
        label: `Recommended ${journey.mode === 'flight' ? 'terminal' : 'station'} buffer`,
        minutes: journey.terminalBufferMinutes,
        formattedValue: `${journey.terminalBufferMinutes} min`,
      },
      {
        id: 'transport',
        label: `Advertised ${journey.mode} journey`,
        minutes: journey.advertisedMinutes,
        formattedValue: `${journey.advertisedMinutes} min`,
      },
      {
        id: 'arrival_process',
        label: 'Arrival and border process',
        minutes: journey.arrivalProcessMinutes,
        formattedValue: `${journey.arrivalProcessMinutes} min`,
      },
      ...(config.assumptions.checked_bag
        ? [
            {
              id: 'checked_bag',
              label: 'Checked-bag handling',
              minutes: journey.checkedBagMinutes,
              formattedValue: `${journey.checkedBagMinutes} min`,
            },
          ]
        : []),
      {
        id: 'final_transfer',
        label: `${journey.arrivalTerminal} to ${journeyDestinations[config.assumptions.destination]}`,
        minutes:
          journey.destinationTransferMinutes[config.assumptions.destination],
        formattedValue: `${journey.destinationTransferMinutes[config.assumptions.destination]} min`,
      },
    ];
    return {
      metric,
      result: row.totalMinutes,
      formattedResult: formatDuration(row.totalMinutes),
      components,
      arithmetic: `${components.map((item) => item.minutes).join(' + ')} = ${row.totalMinutes} minutes`,
      exclusions: [
        'Lounge access',
        'Optional shopping time',
        'Unplanned delays',
      ],
    };
  }
  if (metric === 'arrival_time') {
    const durations: JourneyCalculationComponent[] = [
      {
        id: 'transport',
        label: `Advertised ${journey.mode} journey`,
        minutes: journey.advertisedMinutes,
        formattedValue: `${journey.advertisedMinutes} min`,
      },
      {
        id: 'arrival_process',
        label: 'Arrival and border process',
        minutes: journey.arrivalProcessMinutes,
        formattedValue: `${journey.arrivalProcessMinutes} min`,
      },
      ...(config.assumptions.checked_bag
        ? [
            {
              id: 'checked_bag',
              label: 'Checked-bag handling',
              minutes: journey.checkedBagMinutes,
              formattedValue: `${journey.checkedBagMinutes} min`,
            },
          ]
        : []),
      {
        id: 'final_transfer',
        label: `${journey.arrivalTerminal} to ${journeyDestinations[config.assumptions.destination]}`,
        minutes:
          journey.destinationTransferMinutes[config.assumptions.destination],
        formattedValue: `${journey.destinationTransferMinutes[config.assumptions.destination]} min`,
      },
      {
        id: 'time_zone',
        label: 'London to Amsterdam clock offset',
        minutes: arrivalTimeZoneOffsetMinutes,
        formattedValue: `+${arrivalTimeZoneOffsetMinutes} min`,
      },
    ];
    const components: JourneyCalculationComponent[] = [
      {
        id: 'scheduled_departure',
        label: `Booked departure from ${journey.departureTerminal}`,
        minuteOfDay: journey.departureMinute,
        formattedValue: `${formatClock(journey.departureMinute)} London time`,
      },
      ...durations,
    ];
    return {
      metric,
      result: row.arrivalMinute,
      formattedResult: `${formatClock(row.arrivalMinute)} local`,
      components,
      arithmetic: `${formatClock(journey.departureMinute)} London + ${durations.map((item) => `${item.minutes} min`).join(' + ')} = ${formatClock(row.arrivalMinute)} Amsterdam`,
      exclusions: [
        'Origin access before departure',
        'Recommended terminal or station buffer',
        'Unplanned delays',
      ],
    };
  }
  if (metric === 'arrival_slack') {
    const components: JourneyCalculationComponent[] = [
      {
        id: 'arrival_deadline',
        label: 'Traveller arrival deadline',
        minuteOfDay: config.assumptions.arrival_deadline_minutes,
        formattedValue: `${formatClock(config.assumptions.arrival_deadline_minutes)} Amsterdam time`,
      },
      {
        id: 'calculated_arrival',
        label: 'Calculated local arrival',
        minuteOfDay: row.arrivalMinute,
        formattedValue: `${formatClock(row.arrivalMinute)} Amsterdam time`,
      },
    ];
    return {
      metric,
      result: row.arrivalSlackMinutes,
      formattedResult: `${row.arrivalSlackMinutes} min`,
      components,
      arithmetic: `${formatClock(config.assumptions.arrival_deadline_minutes)} deadline − ${formatClock(row.arrivalMinute)} arrival = ${row.arrivalSlackMinutes} minutes slack`,
      exclusions: ['Unplanned delays after the booked departure'],
    };
  }
  if (metric === 'walking_distance') {
    const adjustment = destinationWalkAdjustment(
      config.assumptions.destination,
    );
    const components: JourneyCalculationComponent[] = [
      {
        id: 'base_walking',
        label: 'Published itinerary walking',
        kilometres: journey.walkingKm,
        formattedValue: `${journey.walkingKm.toFixed(1)} km`,
      },
      {
        id: 'destination_adjustment',
        label: `${journeyDestinations[config.assumptions.destination]} destination adjustment`,
        kilometres: adjustment,
        formattedValue: `+${adjustment.toFixed(1)} km`,
      },
    ];
    return {
      metric,
      result: row.walkingKm,
      formattedResult: `${row.walkingKm.toFixed(1)} km`,
      components,
      arithmetic: `${journey.walkingKm.toFixed(1)} km + ${adjustment.toFixed(1)} km = ${row.walkingKm.toFixed(1)} km`,
      exclusions: [
        'Incidental walking inside stations or terminals',
        'Optional detours',
      ],
    };
  }
  const connectionPenalty =
    journey.connectionSlackMinutes == null
      ? 0
      : Math.max(0, 40 - journey.connectionSlackMinutes) * 0.25;
  const components: JourneyCalculationComponent[] = [
    {
      id: 'historical_base',
      label: `Historical punctuality · ${journey.punctualityBand}`,
      percentagePoints: journey.baseRiskPercent,
      formattedValue: `+${journey.baseRiskPercent.toFixed(1)} pts`,
    },
    ...(journey.connectionSlackMinutes == null
      ? []
      : [
          {
            id: 'connection',
            label: `${journey.connectionSlackMinutes}-minute connection buffer`,
            percentagePoints: connectionPenalty,
            formattedValue: `+${connectionPenalty.toFixed(1)} pts`,
          },
        ]),
    ...(config.assumptions.checked_bag
      ? [
          {
            id: 'checked_bag',
            label: 'Checked-bag exposure',
            percentagePoints: journey.bagRiskDelta,
            formattedValue: `+${journey.bagRiskDelta.toFixed(1)} pts`,
          },
        ]
      : []),
  ];
  return {
    metric,
    result: row.riskPercent,
    formattedResult: `${row.riskPercent.toFixed(1)}%`,
    components,
    arithmetic: `${components.map((item) => item.percentagePoints!.toFixed(1)).join(' + ')} = ${row.riskPercent.toFixed(1)}%`,
    exclusions: [
      'Weather forecasts',
      'Live operations',
      'Personal lounge access',
    ],
  };
}

export function journeyRelaxations(
  config: JourneyView,
  hiddenIds: string[] = [],
) {
  const result = evaluateJourneys(config, hiddenIds);
  if (result.ranked.length) return [];
  const options: Array<{
    id: string;
    label: string;
    value: number;
    count: number;
  }> = [];
  const latestDeadline = Math.min(
    ...result.all.map((row) => row.arrivalMinute),
  );
  if (
    Number.isFinite(latestDeadline) &&
    latestDeadline > config.assumptions.arrival_deadline_minutes
  ) {
    const relaxed = {
      ...config,
      assumptions: {
        ...config.assumptions,
        arrival_deadline_minutes: latestDeadline,
      },
    };
    options.push({
      id: 'arrival_deadline_minutes',
      label: `Allow arrival by ${formatClock(latestDeadline)}`,
      value: latestDeadline,
      count: evaluateJourneys(relaxed, hiddenIds).ranked.length,
    });
  }
  const connecting = result.all.filter(
    (row) => row.journey.connectionSlackMinutes != null,
  );
  if (
    config.requirements.includes('minimum_connection_slack') &&
    connecting.length
  ) {
    const best = Math.max(
      ...connecting.map((row) => row.journey.connectionSlackMinutes ?? 0),
    );
    const relaxed = {
      ...config,
      assumptions: {
        ...config.assumptions,
        minimum_connection_slack_minutes: best,
      },
    };
    options.push({
      id: 'minimum_connection_slack_minutes',
      label: `Allow a ${best}-minute connection buffer`,
      value: best,
      count: evaluateJourneys(relaxed, hiddenIds).ranked.length,
    });
  }
  return options.filter((option) => option.count > 0).slice(0, 3);
}
