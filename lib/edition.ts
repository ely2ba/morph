import type {
  ComponentVariant,
  NativeComponent,
  NativeComponentFieldId,
} from './composition';

export type TopicId =
  | 'uk'
  | 'world'
  | 'science'
  | 'local'
  | 'technology'
  | 'culture'
  | 'business'
  | 'sport'
  | 'celebrity';
export type ScopeId = 'uk' | 'world' | 'local';
export type MinimumId = 'uk' | 'world' | 'science' | 'local';
export type ArticleRole =
  | 'report'
  | 'follow_up'
  | 'wire'
  | 'rewrite'
  | 'background';
export type BackgroundMode = 'omit' | 'include_free' | 'include_counted';

export const editionComponentMetricIds = [
  'reading_time',
  'novel_facts',
  'original_reporting',
  'publication_order',
  'topic',
] as const;

export type EditionComponentMetricId =
  (typeof editionComponentMetricIds)[number];

export const editionComponentFields = [
  'heading',
  'variant',
  'record_ids',
  'sort_metric_id',
  'sort_direction',
  'width',
  'limit',
] as const;

const editionBaseComponentFields = ['heading', 'width'] as const;
export const editionComponentFieldsByType: Readonly<
  Record<string, readonly NativeComponentFieldId[]>
> = {
  decision_summary: editionBaseComponentFields,
  assumptions: ['width'],
  metric_strip: editionBaseComponentFields,
  finite_edition: [
    ...editionBaseComponentFields,
    'record_ids',
    'sort_metric_id',
    'sort_direction',
    'limit',
  ],
  chronological_timeline: [
    ...editionBaseComponentFields,
    'record_ids',
    'variant',
  ],
  provenance_map: [...editionBaseComponentFields, 'record_ids'],
  repeated_coverage: [...editionBaseComponentFields, 'record_ids'],
  disagreement_board: editionBaseComponentFields,
  reading_queue: [
    ...editionBaseComponentFields,
    'record_ids',
    'sort_metric_id',
    'sort_direction',
    'limit',
  ],
  topic_dashboard: editionBaseComponentFields,
  comparison: editionBaseComponentFields,
  selection_explanation: editionBaseComponentFields,
  background_material: [
    ...editionBaseComponentFields,
    'record_ids',
    'variant',
  ],
  checklist: editionBaseComponentFields,
  relaxations: editionBaseComponentFields,
};

export const editionComponentVariantsByType: Readonly<
  Record<string, readonly ComponentVariant[]>
> = {
  chronological_timeline: ['default', 'new_only'],
  background_material: ['default', 'new_only'],
};

export type EventFact = { id: string; text: string };
export type StoryCluster = {
  id: string;
  label: string;
  topicId: TopicId;
  scopeId: ScopeId;
  section: string;
  priority: number;
  primaryOriginalArticleId: string;
  backgroundArticleId?: string;
  facts: EventFact[];
};
export type Article = {
  id: string;
  clusterId: string;
  publication: string;
  reporter: string;
  publishedAt: string;
  readSeconds: number;
  development: 0 | 1 | 2;
  role: ArticleRole;
  originalReporting: boolean;
  parentArticleIds: string[];
  factIds: string[];
  introducedFactIds: string[];
  headline: string;
  deck: string;
};
export type EditionConfig = {
  budgetSeconds: number;
  excludedTopicIds: TopicId[];
  minimums: Record<MinimumId, number>;
  originalReportingWeight: number;
  backgroundMode: BackgroundMode;
  composition: NativeComponent[];
};
export type EditionCandidate = {
  cluster: StoryCluster;
  representative: Article;
  background: Article | null;
  related: Article[];
  whatNewFacts: EventFact[];
  seconds: number;
};
export type EditionSelection = {
  feasible: boolean;
  selected: EditionCandidate[];
  usedSeconds: number;
  remainingSeconds: number;
  requirementCoverage: Record<MinimumId, number>;
};

export const topicLabels: Record<TopicId, string> = {
  uk: 'UK',
  world: 'World',
  science: 'Science',
  local: 'Local',
  technology: 'Technology',
  culture: 'Culture',
  business: 'Business',
  sport: 'Sport',
  celebrity: 'Celebrity',
};

export const clusters: StoryCluster[] = [
  {
    id: 'solmere-tide',
    label: 'Solmere tidal-grid trial',
    topicId: 'uk',
    scopeId: 'uk',
    section: 'Climate',
    priority: 9,
    primaryOriginalArticleId: 'sol-01',
    backgroundArticleId: 'sol-04',
    facts: [
      {
        id: 'sol0',
        text: 'The Solmere array has six reversible turbines and a 24 MW test ceiling.',
      },
      { id: 'sol1', text: 'Operators closed the test cycle at 05:30 BST.' },
      {
        id: 'sol2',
        text: 'The first two tide windows exported 42 MWh to the local grid.',
      },
      { id: 'sol3', text: 'An independent meter recorded an 18 MW peak.' },
      {
        id: 'sol4',
        text: 'The harbour channel reopened 11 minutes ahead of the published window.',
      },
    ],
  },
  {
    id: 'selene-ice',
    label: 'Selene-3 lunar ice map',
    topicId: 'science',
    scopeId: 'world',
    section: 'Science',
    priority: 10,
    primaryOriginalArticleId: 'sel-02',
    backgroundArticleId: 'sel-01',
    facts: [
      {
        id: 'sel0',
        text: 'The Selene-3 mapper surveyed 61 permanently shadowed craters.',
      },
      {
        id: 'sel1',
        text: 'Researchers resolved two cold traps below the previous 500-metre mapping limit.',
      },
      {
        id: 'sel2',
        text: 'Spectrometer readings matched the team’s water-ice threshold in both traps.',
      },
      {
        id: 'sel3',
        text: 'A calibration update shifted the recommended landing ellipse 3.6 km east.',
      },
      {
        id: 'sel4',
        text: 'The revised ellipse retains 14 hours of direct relay visibility.',
      },
    ],
  },
  {
    id: 'calder-sleeper',
    label: 'Calder Sleeper expansion',
    topicId: 'uk',
    scopeId: 'uk',
    section: 'UK',
    priority: 7,
    primaryOriginalArticleId: 'cal-01',
    facts: [
      {
        id: 'cal0',
        text: 'The Calder Sleeper pilot currently runs three nights each week.',
      },
      {
        id: 'cal1',
        text: 'The transport regulator approved nightly service for the winter timetable.',
      },
      {
        id: 'cal2',
        text: 'The approved formation reserves two wheelchair spaces on every departure.',
      },
      {
        id: 'cal3',
        text: 'The first nightly service is scheduled for 12 October.',
      },
    ],
  },
  {
    id: 'maris-corridor',
    label: 'Maris Bay freight corridor',
    topicId: 'world',
    scopeId: 'world',
    section: 'World',
    priority: 8,
    primaryOriginalArticleId: 'mar-01',
    facts: [
      {
        id: 'mar0',
        text: 'Maris Bay crossings had been suspended for nine days.',
      },
      {
        id: 'mar1',
        text: 'Port authorities agreed a 72-hour inspected freight corridor.',
      },
      { id: 'mar2', text: 'The agreement limits each convoy to 40 lorries.' },
      {
        id: 'mar3',
        text: 'The first inspected convoy cleared East Quay at 08:31 CET.',
      },
      {
        id: 'mar4',
        text: 'Thirty-eight lorries completed the first crossing.',
      },
    ],
  },
  {
    id: 'old-quay',
    label: 'Old Quay housing decision',
    topicId: 'local',
    scopeId: 'local',
    section: 'Local',
    priority: 6,
    primaryOriginalArticleId: 'qua-01',
    facts: [
      {
        id: 'qua0',
        text: 'The Old Quay plan contains 214 homes, 62 classed as affordable.',
      },
      { id: 'qua1', text: 'A planning vote had been listed for 4 September.' },
      {
        id: 'qua2',
        text: 'A new survey found an uncharted brick culvert beneath the east block.',
      },
      {
        id: 'qua3',
        text: 'The committee moved the vote to 18 September pending an engineering note.',
      },
    ],
  },
  {
    id: 'vesper-optics',
    label: 'Vesper optical-compute trial',
    topicId: 'technology',
    scopeId: 'world',
    section: 'Technology',
    priority: 5,
    primaryOriginalArticleId: 'ves-01',
    facts: [
      { id: 'ves0', text: 'The Vesper trial links 24 optical compute nodes.' },
      {
        id: 'ves1',
        text: 'The first run used 38% less rack power than the lab’s copper baseline.',
      },
      {
        id: 'ves2',
        text: 'A second laboratory will begin an independent replication in October.',
      },
    ],
  },
  {
    id: 'alder-ceramics',
    label: 'Alder Museum ceramics return',
    topicId: 'culture',
    scopeId: 'world',
    section: 'Culture',
    priority: 4,
    primaryOriginalArticleId: 'ald-02',
    backgroundArticleId: 'ald-01',
    facts: [
      {
        id: 'ald0',
        text: 'The Alder Museum began a provenance review in 2024.',
      },
      {
        id: 'ald1',
        text: 'The review identified 14 Maravian ceramics acquired through dealer Leto Vann.',
      },
      {
        id: 'ald2',
        text: 'The museum and Maravia’s cultural ministry signed a transfer agreement.',
      },
      {
        id: 'ald3',
        text: 'Digitised catalogue records will remain openly accessible after the return.',
      },
    ],
  },
  {
    id: 'fen-irrigation',
    label: 'Fen Orchard irrigation pilot',
    topicId: 'business',
    scopeId: 'uk',
    section: 'Business',
    priority: 3,
    primaryOriginalArticleId: 'fen-01',
    facts: [
      {
        id: 'fen0',
        text: 'The Fen Orchard cooperative fitted soil probes across 11 hectares.',
      },
      {
        id: 'fen1',
        text: 'The pilot used 12% less irrigation water than the cooperative’s five-year baseline.',
      },
      { id: 'fen2', text: 'Six neighbouring farms joined the next phase.' },
    ],
  },
  {
    id: 'dunmere-cup',
    label: 'Dunmere cup semi-final',
    topicId: 'sport',
    scopeId: 'uk',
    section: 'Sport',
    priority: 2,
    primaryOriginalArticleId: 'dun-01',
    facts: [
      { id: 'dun0', text: 'Dunmere won the cup semi-final 3–1.' },
      { id: 'dun1', text: 'Forward Ivo Pell scored twice.' },
      { id: 'dun2', text: 'The final is scheduled for 20 September.' },
    ],
  },
  {
    id: 'mira-residency',
    label: 'Mira Vale theatre residency',
    topicId: 'celebrity',
    scopeId: 'world',
    section: 'Culture',
    priority: 1,
    primaryOriginalArticleId: 'mir-01',
    facts: [
      {
        id: 'mir0',
        text: 'Actor Mira Vale announced a winter residency at Lark Theatre.',
      },
      { id: 'mir1', text: 'The run contains 24 performances.' },
      { id: 'mir2', text: 'Public booking opens on 8 September.' },
    ],
  },
];

type ArticleSeed = readonly [
  string,
  string,
  string,
  string,
  string,
  number,
  0 | 1 | 2,
  ArticleRole,
  boolean,
  string[],
  string[],
  string[],
  string,
  string,
];
const seeds: ArticleSeed[] = [
  [
    'sol-01',
    'solmere-tide',
    'Harbour Ledger',
    'Noor Bell',
    '2026-09-04T06:18:00+01:00',
    168,
    1,
    'report',
    true,
    [],
    ['sol0', 'sol1', 'sol2'],
    ['sol1', 'sol2'],
    'Solmere tidal array begins full-grid trial',
    'Harbour engineers closed the six-gate array before dawn and exported 42 MWh across the first two tide windows.',
  ],
  [
    'sol-02',
    'solmere-tide',
    'Northstar Wire',
    'News desk',
    '2026-09-04T06:31:00+01:00',
    104,
    1,
    'wire',
    false,
    ['sol-01'],
    ['sol1', 'sol2'],
    [],
    'Tidal trial feeds power into Solmere grid',
    'A six-turbine harbour test exported 42 MWh after operators began the cycle at 5.30am.',
  ],
  [
    'sol-03',
    'solmere-tide',
    'Beacon Daily',
    'Elian Ford',
    '2026-09-04T09:10:00+01:00',
    96,
    2,
    'rewrite',
    false,
    ['sol-05'],
    ['sol3', 'sol4'],
    [],
    'Solmere test reaches 18 MW peak',
    'A follow-up meter reading put the trial peak at 18 MW before the navigation channel reopened early.',
  ],
  [
    'sol-04',
    'solmere-tide',
    'Field Manual',
    'Priya Senn',
    '2026-09-02T12:00:00+01:00',
    147,
    0,
    'background',
    false,
    [],
    ['sol0'],
    ['sol0'],
    'How Solmere’s reversible tidal gates work',
    'Six turbines can generate on incoming and outgoing tides, with a 24 MW ceiling during the demonstration phase.',
  ],
  [
    'sol-05',
    'solmere-tide',
    'Harbour Ledger',
    'Noor Bell',
    '2026-09-04T09:02:00+01:00',
    126,
    2,
    'follow_up',
    true,
    ['sol-01'],
    ['sol1', 'sol2', 'sol3', 'sol4'],
    ['sol3', 'sol4'],
    'Independent meter confirms Solmere test peak',
    'The harbour trial reached 18 MW, and operators reopened the navigation channel 11 minutes earlier than planned.',
  ],
  [
    'sel-01',
    'selene-ice',
    'Observatory Review',
    'Amira Holt',
    '2026-09-01T15:00:00+01:00',
    150,
    0,
    'background',
    false,
    [],
    ['sel0'],
    ['sel0'],
    'Why lunar cold traps keep water ice in reach',
    'The Selene-3 survey covers 61 permanently shadowed craters whose shapes constrain future landing plans.',
  ],
  [
    'sel-02',
    'selene-ice',
    'Orbital Desk',
    'Leena Rao',
    '2026-09-04T07:10:00+01:00',
    171,
    1,
    'report',
    true,
    [],
    ['sel0', 'sel1', 'sel2'],
    ['sel1', 'sel2'],
    'Selene-3 resolves two smaller lunar cold traps',
    'Mission scientists mapped two shadowed basins and found spectra consistent with the team’s ice threshold.',
  ],
  [
    'sel-03',
    'selene-ice',
    'Northstar Wire',
    'Tomas Ilyin',
    '2026-09-04T09:26:00+01:00',
    102,
    2,
    'wire',
    false,
    ['sel-04'],
    ['sel3', 'sel4'],
    [],
    'Selene landing ellipse moves east after calibration',
    'A wire follow-up says the preferred ellipse moved 3.6 km while retaining 14 hours of relay visibility.',
  ],
  [
    'sel-04',
    'selene-ice',
    'Orbital Desk',
    'Leena Rao',
    '2026-09-04T09:18:00+01:00',
    119,
    2,
    'follow_up',
    true,
    ['sel-02'],
    ['sel1', 'sel2', 'sel3', 'sel4'],
    ['sel3', 'sel4'],
    'Calibration shifts Selene landing ellipse east',
    'A revised instrument model moves the preferred ellipse 3.6 km while retaining 14 hours of relay visibility.',
  ],
  [
    'cal-01',
    'calder-sleeper',
    'Cityline',
    'Imogen Price',
    '2026-09-04T06:55:00+01:00',
    142,
    1,
    'report',
    true,
    [],
    ['cal0', 'cal1'],
    ['cal0', 'cal1'],
    'Regulator clears nightly Calder Sleeper',
    'The three-night rail pilot can run every night under the winter timetable approved this morning.',
  ],
  [
    'cal-02',
    'calder-sleeper',
    'Northstar Wire',
    'News desk',
    '2026-09-04T08:29:00+01:00',
    101,
    2,
    'rewrite',
    false,
    ['cal-03'],
    ['cal2', 'cal3'],
    [],
    'Calder Sleeper sets October nightly launch',
    'A rewritten follow-up gives the 12 October start date and confirms two wheelchair spaces per train.',
  ],
  [
    'cal-03',
    'calder-sleeper',
    'Cityline',
    'Imogen Price',
    '2026-09-04T08:20:00+01:00',
    115,
    2,
    'follow_up',
    true,
    ['cal-01'],
    ['cal0', 'cal1', 'cal2', 'cal3'],
    ['cal2', 'cal3'],
    'Calder Sleeper sets first nightly departure',
    'Nightly running starts 12 October, with two wheelchair spaces reserved on every train.',
  ],
  [
    'mar-01',
    'maris-corridor',
    'Meridian Dispatch',
    'Sefa Orr',
    '2026-09-04T06:20:00+01:00',
    164,
    1,
    'report',
    true,
    [],
    ['mar0', 'mar1', 'mar2'],
    ['mar0', 'mar1', 'mar2'],
    'Maris ports agree 72-hour freight corridor',
    'A temporary inspected route allows convoys of up to 40 lorries after nine days without crossings.',
  ],
  [
    'mar-02',
    'maris-corridor',
    'Atlas Wire',
    'Nadi Kess',
    '2026-09-04T08:51:00+01:00',
    98,
    2,
    'wire',
    false,
    ['mar-03'],
    ['mar3', 'mar4'],
    [],
    'First Maris convoy completes inspected crossing',
    'A wire report says 38 lorries cleared East Quay at 8.31am under the new inspection process.',
  ],
  [
    'mar-03',
    'maris-corridor',
    'Meridian Dispatch',
    'Sefa Orr',
    '2026-09-04T08:44:00+01:00',
    113,
    2,
    'follow_up',
    true,
    ['mar-01'],
    ['mar0', 'mar1', 'mar2', 'mar3', 'mar4'],
    ['mar3', 'mar4'],
    'First convoy clears new Maris corridor',
    'Thirty-eight lorries left East Quay at 8.31am after completing the agreed inspection process.',
  ],
  [
    'qua-01',
    'old-quay',
    'Borough Record',
    'Fen Cole',
    '2026-09-04T06:30:00+01:00',
    133,
    1,
    'report',
    true,
    [],
    ['qua0', 'qua1'],
    ['qua0', 'qua1'],
    'Old Quay homes head for planning vote',
    'Councillors were due to decide a 214-home scheme that includes 62 affordable homes.',
  ],
  [
    'qua-02',
    'old-quay',
    'Metro Brief',
    'Isla Reed',
    '2026-09-04T08:07:00+01:00',
    92,
    2,
    'rewrite',
    false,
    ['qua-03'],
    ['qua2', 'qua3'],
    [],
    'Old Quay vote moves after culvert discovery',
    'A rewritten update says a brick culvert pushed the planning decision back to 18 September.',
  ],
  [
    'qua-03',
    'old-quay',
    'Borough Record',
    'Fen Cole',
    '2026-09-04T07:58:00+01:00',
    115,
    2,
    'follow_up',
    true,
    ['qua-01'],
    ['qua0', 'qua1', 'qua2', 'qua3'],
    ['qua2', 'qua3'],
    'Culvert survey delays Old Quay housing vote',
    'An uncharted brick culvert under the east block has moved the decision to 18 September.',
  ],
  [
    'ves-01',
    'vesper-optics',
    'Circuit Journal',
    'Rafi Mensah',
    '2026-09-04T05:55:00+01:00',
    176,
    1,
    'report',
    true,
    [],
    ['ves0', 'ves1'],
    ['ves0', 'ves1'],
    'Vesper optical trial cuts rack power by 38%',
    'A 24-node photonic compute run used 38% less power than the lab’s matched copper baseline.',
  ],
  [
    'ves-02',
    'vesper-optics',
    'Northstar Wire',
    'News desk',
    '2026-09-04T06:15:00+01:00',
    99,
    1,
    'wire',
    false,
    ['ves-01'],
    ['ves0', 'ves1'],
    [],
    'Optical compute test reports lower power use',
    'The Vesper team says its 24-node trial used 38% less rack power than a copper setup.',
  ],
  [
    'ves-03',
    'vesper-optics',
    'Open Lab Register',
    'Research desk',
    '2026-09-04T07:35:00+01:00',
    124,
    2,
    'follow_up',
    false,
    ['ves-01'],
    ['ves0', 'ves1', 'ves2'],
    ['ves2'],
    'Second lab joins Vesper chip replication',
    'An independent team will rerun the 24-node optical trial in October using the published benchmark.',
  ],
  [
    'ald-01',
    'alder-ceramics',
    'Archive Quarterly',
    'Esme Taro',
    '2026-09-02T11:00:00+01:00',
    137,
    0,
    'background',
    false,
    [],
    ['ald0'],
    ['ald0'],
    'Tracing the Alder Museum’s Maravian collection',
    'A review begun in 2024 follows the acquisition records for works bought through dealer Leto Vann.',
  ],
  [
    'ald-02',
    'alder-ceramics',
    'Civic Arts',
    'Esme Taro',
    '2026-09-04T05:40:00+01:00',
    160,
    1,
    'report',
    true,
    [],
    ['ald0', 'ald1'],
    ['ald1'],
    'Alder review identifies 14 ceramics for return',
    'Researchers linked 14 Maravian pieces to dealer Leto Vann during a two-year provenance review.',
  ],
  [
    'ald-03',
    'alder-ceramics',
    'Civic Arts',
    'Esme Taro',
    '2026-09-04T06:55:00+01:00',
    111,
    2,
    'follow_up',
    true,
    ['ald-02'],
    ['ald0', 'ald1', 'ald2', 'ald3'],
    ['ald2', 'ald3'],
    'Alder Museum signs return of 14 ceramics',
    'The transfer agreement preserves open catalogue records after the works return to Maravia.',
  ],
  [
    'fen-01',
    'fen-irrigation',
    'Rural Ledger',
    'Jae Wynn',
    '2026-09-03T16:30:00+01:00',
    152,
    1,
    'report',
    true,
    [],
    ['fen0', 'fen1'],
    ['fen0', 'fen1'],
    'Soil probes cut Fen Orchard water use by 12%',
    'The cooperative’s 11-hectare sensor pilot beat its five-year irrigation baseline.',
  ],
  [
    'fen-02',
    'fen-irrigation',
    'Rural Ledger',
    'Jae Wynn',
    '2026-09-04T06:20:00+01:00',
    108,
    2,
    'follow_up',
    true,
    ['fen-01'],
    ['fen0', 'fen1', 'fen2'],
    ['fen2'],
    'Six farms join Fen Orchard irrigation trial',
    'The next phase expands the sensor scheme beyond the original 11-hectare cooperative.',
  ],
  [
    'dun-01',
    'dunmere-cup',
    'Matchline',
    'Ava Quist',
    '2026-09-04T09:30:00+01:00',
    121,
    1,
    'report',
    true,
    [],
    ['dun0', 'dun1', 'dun2'],
    ['dun0', 'dun1', 'dun2'],
    'Dunmere reaches cup final with 3–1 win',
    'Ivo Pell scored twice as Dunmere secured a place in the 20 September final.',
  ],
  [
    'dun-02',
    'dunmere-cup',
    'Score Wire',
    'News desk',
    '2026-09-04T09:46:00+01:00',
    89,
    1,
    'wire',
    false,
    ['dun-01'],
    ['dun0', 'dun1', 'dun2'],
    [],
    'Pell double sends Dunmere into final',
    'Dunmere’s 3–1 semi-final victory booked a cup-final place later this month.',
  ],
  [
    'mir-01',
    'mira-residency',
    'Stage Door',
    'Lio Park',
    '2026-09-04T10:05:00+01:00',
    128,
    1,
    'report',
    true,
    [],
    ['mir0', 'mir1', 'mir2'],
    ['mir0', 'mir1', 'mir2'],
    'Mira Vale confirms Lark Theatre residency',
    'The actor’s 24-performance winter run opens public booking on 8 September.',
  ],
  [
    'mir-02',
    'mira-residency',
    'Spotlight Feed',
    'News desk',
    '2026-09-04T10:18:00+01:00',
    78,
    1,
    'rewrite',
    false,
    ['mir-01'],
    ['mir0', 'mir1', 'mir2'],
    [],
    'Vale announces 24-show winter run',
    'Mira Vale will lead a new residency at Lark Theatre, with booking opening next week.',
  ],
];

export const articles: Article[] = seeds.map(
  ([
    id,
    clusterId,
    publication,
    reporter,
    publishedAt,
    readSeconds,
    development,
    role,
    originalReporting,
    parentArticleIds,
    factIds,
    introducedFactIds,
    headline,
    deck,
  ]) => ({
    id,
    clusterId,
    publication,
    reporter,
    publishedAt,
    readSeconds,
    development,
    role,
    originalReporting,
    parentArticleIds,
    factIds,
    introducedFactIds,
    headline,
    deck,
  }),
);
export const clusterById = new Map(
  clusters.map((cluster) => [cluster.id, cluster]),
);
export const articleById = new Map(
  articles.map((article) => [article.id, article]),
);

export const canonicalEdition: EditionConfig = {
  budgetSeconds: 600,
  excludedTopicIds: ['sport', 'celebrity'],
  minimums: { uk: 1, world: 1, science: 1, local: 0 },
  originalReportingWeight: 0.8,
  backgroundMode: 'omit',
  composition: [
    { id: 'summary', type: 'decision_summary' },
    { id: 'controls', type: 'assumptions' },
    { id: 'queue', type: 'reading_queue' },
    { id: 'comparison', type: 'comparison' },
    { id: 'reason', type: 'selection_explanation' },
  ],
};

export function formatReadingTime(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60),
    remainder = whole % 60;
  if (!minutes) return `${remainder}s`;
  return remainder
    ? `${minutes}m ${String(remainder).padStart(2, '0')}s`
    : `${minutes}m`;
}

export function formatPublished(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/London',
  }).format(new Date(iso));
}

function matchesMinimum(cluster: StoryCluster, id: MinimumId) {
  if (id === 'science') return cluster.topicId === 'science';
  return cluster.scopeId === id;
}

export function buildEditionCandidates(
  config: EditionConfig,
  hiddenPublications: string[] = [],
): EditionCandidate[] {
  return clusters
    .filter((cluster) => !config.excludedTopicIds.includes(cluster.topicId))
    .map((cluster) => {
      const visible = articles.filter(
        (article) =>
          article.clusterId === cluster.id &&
          !hiddenPublications.includes(article.publication),
      );
      const developments = visible.filter(
        (article) => article.role !== 'background',
      );
      if (!developments.length) return null;
      const latestDevelopment = Math.max(
        ...developments.map((article) => article.development),
      );
      const latest = developments.filter(
        (article) => article.development === latestDevelopment,
      );
      const maxRead = Math.max(...latest.map((article) => article.readSeconds));
      const representative = [...latest].sort((a, b) => {
        const score = (article: Article) =>
          config.originalReportingWeight * Number(article.originalReporting) +
          (1 - config.originalReportingWeight) *
            (1 - article.readSeconds / maxRead);
        return (
          score(b) - score(a) ||
          b.introducedFactIds.length - a.introducedFactIds.length ||
          b.publishedAt.localeCompare(a.publishedAt) ||
          a.id.localeCompare(b.id)
        );
      })[0];
      const availableBackground =
        visible.find((article) => article.id === cluster.backgroundArticleId) ??
        null;
      const background =
        config.backgroundMode === 'omit' ? null : availableBackground;
      const factMap = new Map(cluster.facts.map((fact) => [fact.id, fact]));
      const newestFactIds = new Set(
        latest.flatMap((article) => article.introducedFactIds),
      );
      const whatNewFacts = [...newestFactIds]
        .map((id) => factMap.get(id))
        .filter(Boolean) as EventFact[];
      const seconds =
        representative.readSeconds +
        (config.backgroundMode === 'include_counted'
          ? (background?.readSeconds ?? 0)
          : 0);
      const related = visible.filter(
        (article) =>
          article.id !== representative.id &&
          (config.backgroundMode !== 'omit' || article.role !== 'background'),
      );
      return {
        cluster,
        representative,
        background,
        related,
        whatNewFacts,
        seconds,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b!.cluster.priority - a!.cluster.priority ||
        a!.cluster.id.localeCompare(b!.cluster.id),
    ) as EditionCandidate[];
}

export function selectEdition(
  config: EditionConfig,
  pinnedClusterIds: string[] = [],
  hiddenPublications: string[] = [],
): EditionSelection {
  const candidates = buildEditionCandidates(config, hiddenPublications);
  const selected: EditionCandidate[] = [];
  let usedSeconds = 0,
    feasible = true;
  const add = (candidate: EditionCandidate | undefined) => {
    if (
      !candidate ||
      selected.some((item) => item.cluster.id === candidate.cluster.id)
    )
      return true;
    if (usedSeconds + candidate.seconds > config.budgetSeconds) return false;
    selected.push(candidate);
    usedSeconds += candidate.seconds;
    return true;
  };
  for (const id of pinnedClusterIds) {
    const pinned = candidates.find((candidate) => candidate.cluster.id === id);
    if (!pinned || !add(pinned)) feasible = false;
  }
  const minimumIds: MinimumId[] = ['uk', 'world', 'science', 'local'];
  for (const id of minimumIds) {
    while (
      selected.filter((candidate) => matchesMinimum(candidate.cluster, id))
        .length < config.minimums[id]
    ) {
      const next = candidates.find(
        (candidate) =>
          matchesMinimum(candidate.cluster, id) &&
          !selected.includes(candidate),
      );
      if (!next || !add(next)) {
        feasible = false;
        break;
      }
    }
  }
  if (feasible) for (const candidate of candidates) add(candidate);
  selected.sort(
    (a, b) =>
      b.cluster.priority - a.cluster.priority ||
      a.cluster.id.localeCompare(b.cluster.id),
  );
  const requirementCoverage = Object.fromEntries(
    minimumIds.map((id) => [
      id,
      selected.filter((candidate) => matchesMinimum(candidate.cluster, id))
        .length,
    ]),
  ) as Record<MinimumId, number>;
  return {
    feasible,
    selected: feasible ? selected : [],
    usedSeconds: feasible ? usedSeconds : 0,
    remainingSeconds: feasible
      ? config.budgetSeconds - usedSeconds
      : config.budgetSeconds,
    requirementCoverage,
  };
}

export function selectionReason(
  candidate: EditionCandidate,
  selection: EditionSelection,
  config: EditionConfig,
) {
  const index = selection.selected.findIndex(
    (item) => item.cluster.id === candidate.cluster.id,
  );
  const before = selection.selected
    .slice(0, Math.max(index, 0))
    .reduce((sum, item) => sum + item.seconds, 0);
  const matches = (['uk', 'world', 'science', 'local'] as MinimumId[]).filter(
    (id) => config.minimums[id] > 0 && matchesMinimum(candidate.cluster, id),
  );
  const visibleArticles = [candidate.representative, ...candidate.related];
  const primary =
    visibleArticles.find(
      (article) => article.id === candidate.cluster.primaryOriginalArticleId,
    ) ?? visibleArticles.find((article) => article.originalReporting);
  return {
    cluster_id: candidate.cluster.id,
    representative_article_id: candidate.representative.id,
    budget_seconds: config.budgetSeconds,
    used_before_seconds: before,
    story_seconds: candidate.seconds,
    used_after_seconds: before + candidate.seconds,
    matched_minimum_ids: matches,
    novel_facts: candidate.whatNewFacts,
    original_reporting: candidate.representative.originalReporting,
    primary_original_report: primary
      ? {
          article_id: primary.id,
          publication: primary.publication,
          reporter: primary.reporter,
        }
      : null,
    displaced_articles: candidate.related
      .filter((article) => article.role !== 'background')
      .map((article) => ({
        article_id: article.id,
        publication: article.publication,
        role: article.role,
      })),
    deterministic_reason: `${candidate.whatNewFacts.length} verified new ${candidate.whatNewFacts.length === 1 ? 'fact' : 'facts'} · ${candidate.representative.originalReporting ? 'original reporting retained' : 'latest verified follow-up retained'}${matches.length ? ` · preserves ${matches.join(' and ')} coverage` : ''}`,
    arithmetic: `${formatReadingTime(before)} + ${formatReadingTime(candidate.seconds)} = ${formatReadingTime(before + candidate.seconds)} ≤ ${formatReadingTime(config.budgetSeconds)}`,
  };
}

export function compareCoverage(
  clusterId: string,
  requestedArticleIds?: string[],
) {
  const cluster = clusterById.get(clusterId);
  if (!cluster) return null;
  const selected = articles
    .filter(
      (article) =>
        article.clusterId === clusterId &&
        article.role !== 'background' &&
        (!requestedArticleIds || requestedArticleIds.includes(article.id)),
    )
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  if (selected.length < 2) return null;
  const shared = selected[0].factIds.filter((id) =>
    selected.every((article) => article.factIds.includes(id)),
  );
  const factMap = new Map(cluster.facts.map((fact) => [fact.id, fact.text]));
  return {
    cluster,
    sharedFacts: shared.map((id) => ({ id, text: factMap.get(id) })),
    articles: selected.map((article, index) => ({
      ...article,
      publicationOrder: index + 1,
      uniqueFacts: article.factIds
        .filter(
          (id) =>
            !selected.some(
              (other) => other.id !== article.id && other.factIds.includes(id),
            ),
        )
        .map((id) => ({ id, text: factMap.get(id) })),
      genuinelyChanged: article.introducedFactIds.map((id) => ({
        id,
        text: factMap.get(id),
      })),
    })),
  };
}

export function editionRelaxations(
  config: EditionConfig,
  pinnedClusterIds: string[] = [],
  hiddenPublications: string[] = [],
) {
  const current = selectEdition(config, pinnedClusterIds, hiddenPublications);
  if (current.feasible) return [];
  const options: Array<{
    id: string;
    label: string;
    patch: Partial<EditionConfig>;
    restorePublications?: boolean;
    unpinAll?: boolean;
  }> = [];
  const excludedRequirements = new Set<TopicId>();
  for (const id of ['uk', 'world', 'science', 'local'] as MinimumId[]) {
    if (config.minimums[id] <= 0) continue;
    for (const cluster of clusters) {
      if (
        matchesMinimum(cluster, id) &&
        config.excludedTopicIds.includes(cluster.topicId)
      )
        excludedRequirements.add(cluster.topicId);
    }
  }
  for (const clusterId of pinnedClusterIds) {
    const cluster = clusterById.get(clusterId);
    if (cluster && config.excludedTopicIds.includes(cluster.topicId))
      excludedRequirements.add(cluster.topicId);
  }
  for (const topicId of excludedRequirements) {
    const excludedTopicIds = config.excludedTopicIds.filter(
      (id) => id !== topicId,
    );
    if (
      selectEdition(
        { ...config, excludedTopicIds },
        pinnedClusterIds,
        hiddenPublications,
      ).feasible
    ) {
      options.push({
        id: `include-${topicId}`,
        label: `Include ${topicLabels[topicId]} again to preserve the requirement`,
        patch: { excludedTopicIds },
      });
    }
  }
  let minimumFeasibleBudget: number | null = null;
  for (
    let budgetSeconds = config.budgetSeconds + 1;
    budgetSeconds <= 1200;
    budgetSeconds += 1
  ) {
    if (
      selectEdition(
        { ...config, budgetSeconds },
        pinnedClusterIds,
        hiddenPublications,
      ).feasible
    ) {
      minimumFeasibleBudget = budgetSeconds;
      break;
    }
  }
  if (minimumFeasibleBudget !== null)
    options.push({
      id: 'budget',
      label: `Add ${formatReadingTime(minimumFeasibleBudget - config.budgetSeconds)} to include every required topic`,
      patch: { budgetSeconds: minimumFeasibleBudget },
    });
  for (const id of ['uk', 'world', 'science', 'local'] as MinimumId[]) {
    if (config.minimums[id] > 0) {
      const minimums = { ...config.minimums, [id]: config.minimums[id] - 1 };
      if (
        selectEdition(
          { ...config, minimums },
          pinnedClusterIds,
          hiddenPublications,
        ).feasible
      )
        options.push({
          id: `minimum-${id}`,
          label: `Allow the ${id} minimum to fall from ${config.minimums[id]} to ${config.minimums[id] - 1}`,
          patch: { minimums },
        });
    }
  }
  if (
    config.backgroundMode === 'include_counted' &&
    selectEdition(
      { ...config, backgroundMode: 'omit' },
      pinnedClusterIds,
      hiddenPublications,
    ).feasible
  )
    options.push({
      id: 'background',
      label: 'Allow background explainers to be omitted from the budget',
      patch: { backgroundMode: 'omit' },
    });
  if (
    hiddenPublications.length &&
    selectEdition(config, pinnedClusterIds, []).feasible
  )
    options.push({
      id: 'restore-sources',
      label: 'Restore hidden publications needed by this edition',
      patch: {},
      restorePublications: true,
    });
  if (
    pinnedClusterIds.length &&
    selectEdition(config, [], hiddenPublications).feasible
  )
    options.push({
      id: 'unpin-all',
      label: 'Unpin developments that cannot fit this budget',
      patch: {},
      unpinAll: true,
    });
  const feasible = options.filter(
    (option) =>
      selectEdition(
        { ...config, ...option.patch },
        option.unpinAll ? [] : pinnedClusterIds,
        option.restorePublications ? [] : hiddenPublications,
      ).feasible,
  );
  if (feasible.length) return feasible.slice(0, 4);

  const combined: Partial<EditionConfig> = {
    budgetSeconds: 1200,
    excludedTopicIds: [],
    minimums: { uk: 0, world: 0, science: 0, local: 0 },
    backgroundMode: 'omit',
  };
  return [
    {
      id: 'recover-edition',
      label:
        'Restore sources, remove pins and reset coverage minimums within a 20-minute budget',
      patch: combined,
      restorePublications: true,
      unpinAll: true,
    },
  ];
}
