// src/modules/geoscada-generator.js
// Synthetic GeoSCADA log generator based on geoscada_log_content_reference.yaml

export const GENERATOR_INFO = {
  label: "Operational Technology (OT) - Geo SCADA Expert DB Logs",
  description: "Generates synthetic EcoStruxure Geo SCADA Expert database log lines weighted by real-world event prevalence. Covers TRANS, SVR, SVRADVISE, LUS, STBY, LOGIC, DATAFILE, and SNAPSHOT event families from Operational Technology (OT) environments — ideal for testing OT/ICS observability pipelines in Dynatrace.",
  badge: "Operational Technology",
  badgeColor: "bg-blue-100 text-blue-700"
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad2(n) { return String(n).padStart(2, '0'); }
function pad3(n) { return String(n).padStart(3, '0'); }

function fmtTs(d) {
  return `${pad2(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}

function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function hex4() { return ri(0, 0xffff).toString(16).toUpperCase().padStart(4, '0'); }
function randomIp() { return `192.168.${ri(1, 254)}.${ri(1, 254)}`; }
function randomPort() { return ri(1024, 65535); }
function fmt6dp(n) { return n.toFixed(6); }
function fmt3dp(n) { return n.toFixed(3); }
function fmt4dp(n) { return n.toFixed(4); }

const SERVER_POOL = ['SCADA-SVR-01', 'SCADA-SVR-02', 'GEO-PRIMARY', 'GEO-STANDBY', 'SCADA-PROD-A', 'SCADA-PROD-B'];
const PEER_POOL   = ['SCADA-SVR-02', 'SCADA-SVR-01', 'GEO-PRIMARY', 'GEO-STANDBY', 'SCADA-PROD-B', 'SCADA-PROD-A'];

const OS_POOL = [
  'Windows Server 2016 Standard',
  'Windows Server 2016 Datacenter',
  'Windows Server 2019 Standard',
  'Windows Server 2019 Datacenter',
  'Windows Server 2022 Standard',
  'Windows Server 2022 Datacenter',
];

const CPU_POOL = [
  'Intel(R) Xeon(R) E5-2690 v4 @ 2.60GHz',
  'Intel(R) Xeon(R) Gold 5120 CPU @ 2.20GHz',
  'Intel(R) Xeon(R) Gold 6140 CPU @ 2.30GHz',
  'Intel(R) Xeon(R) Gold 6226R CPU @ 2.90GHz',
  'Intel(R) Xeon(R) Gold 6254 CPU @ 3.10GHz',
  'Intel(R) Xeon(R) Silver 4214R CPU @ 2.40GHz',
  'Intel(R) Xeon(R) Silver 4216 CPU @ 2.10GHz',
  'AMD EPYC 7302P 16-Core Processor',
  'AMD EPYC 7443P 24-Core Processor',
];

const VERSION_POOL = [
  '83.5423.1',
  '84.5480.3',
  '85.5543.2',
  '85.5601.4',
  '86.5650.1',
];

const REGISTRY_ROOT_POOL = [
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Schneider Electric\\ClearSCADA',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Schneider Electric\\ClearSCADA',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\AVEVA\\GeoSCADA',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\AVEVA\\GeoSCADA',
];

// Value ranges mirrored from geoscada_log_content_reference.yaml `value_ranges`.
// Keep this in sync with the YAML when either side changes.
const RANGES = {
  trans_syncexecute: {
    seconds: { min: 0.000800, max: 0.001200, baseline_min: 0.000850, baseline_max: 0.000950, spike_max: 0.001100, rare_spike_max: 0.001200, spike_ramp_samples: 5 },
  },
  trans_onexecute: {
    seconds: { min: 0.000800, max: 0.001200, baseline_min: 0.000800, baseline_max: 0.000900, spike_max: 0.001050, rare_spike_max: 0.001200, spike_ramp_samples: 5 },
  },
  svr_accepted_connection: {
    connection: { min: 100,  max: 9999  },
    port:       { min: 1024, max: 65535 },
    ipOctet:    { min: 1,    max: 254   },
  },
  svradvise_sendevent: {
    areaNumber: { min: 1,   max: 999 },
    bytes:      { min: 200, max: 500 },
    clientId:   { min: 1,   max: 99  },
    queueCount: { min: 3, max: 5, baseline_min: 3, baseline_max: 4, spike_max: 5, rare_spike_max: 5, spike_ramp_samples: 5 },
  },
  lus_lock_usage: {
    percent: { min: 70.0000, max: 80.0000, baseline_min: 71.0000, baseline_max: 74.0000, spike_max: 76.0000, rare_spike_max: 80.0000, spike_ramp_samples: 5 },
  },
  logic_onschedule: {
    programs: { min: 12, max: 20, baseline_min: 13, baseline_max: 14, spike_max: 17, rare_spike_max: 20, spike_ramp_samples: 5 },
  },
  datafile_flush_cycle_complete: {
    files:        { min: 0, max: 2    },
    bytesPerFile: { min: 0, max: 2048 },
    ms: { min: 3.000000, max: 4.500000, baseline_min: 3.200000, baseline_max: 3.800000, spike_max: 4.200000, rare_spike_max: 4.500000, spike_ramp_samples: 5 },
  },
  stby_transfer_complete: {
    transfer: { min: 1,     max: 999   },
    seconds:  { min: 0.006, max: 0.009, baseline_min: 0.006, baseline_max: 0.0075, spike_max: 0.008, rare_spike_max: 0.009, spike_ramp_samples: 5 },
    record:   { min: 35000, max: 50000, baseline_min: 38000, baseline_max: 47000, spike_ramp_samples: 5 },
  },
  snapshot_completed: {
    ms: { min: 1100, max: 1800, baseline_min: 1200, baseline_max: 1400, spike_max: 1550, rare_spike_max: 1800, spike_ramp_samples: 5 },
  },
  general_information_snapshot: {
    totalPhysMb:      { min: 49152,  max: 49152  },
    availPhysMb:      { min: 8192,   max: 14336,  baseline_min: 10240, baseline_max: 13312, spike_ramp_samples: 5 },
    totalPageMb:      { min: 16384,  max: 24576  },
    availPageMb:      { min: 4096,   max: 8192,   baseline_min: 5120,  baseline_max: 7168,  spike_ramp_samples: 5 },
    totalVirtMb:      { min: 131072, max: 524288 },
    availVirtMb:      { min: 65536,  max: 131072 },
    workingSetMb:     { min: 1500,   max: 2000,   baseline_min: 1600,  baseline_max: 1850,  spike_ramp_samples: 5 },
    peakWorkingSetMb: { min: 1700,   max: 2000   },
    pageFileMb:       { min: 600,    max: 800,    baseline_min: 650,   baseline_max: 770   },
    peakPageFileMb:   { min: 800,    max: 1000   },
    dbObjectsKb:      { min: 380000, max: 500000, baseline_min: 400000, baseline_max: 470000, spike_ramp_samples: 5 },
    totalDbPoints:    { min: 220000, max: 250000 },
    dbPoints:         { min: 210000, max: 250000, baseline_min: 215000, baseline_max: 240000, spike_ramp_samples: 5 },
    totalOpc:         { min: 50,     max: 200    },
    opc:              { min: 8,      max: 12     },
    totalViewx:       { min: 20,     max: 100    },
    viewx:            { min: 3,      max: 5      },
    totalWebx:        { min: 20,     max: 100    },
    webx:             { min: 4,      max: 6      },
    totalDac:         { min: 30,     max: 100    },
    dac:              { min: 22,     max: 30,    baseline_min: 23, baseline_max: 28, spike_ramp_samples: 5 },
    httpPort:         { min: 8000,   max: 8099   },
    httpsPort:        { min: 8443,   max: 8543   },
    stateChangeOffsetMs: { min: 3600000, max: 604800000 },
    licenseIdPresentPct: 90,
    isMainPct:           50,
    licenseIdMin: 100000,
    licenseIdMax: 999999,
  },
};

// --- Smooth random walk state ---
// Persists the current value for each numeric metric field across calls within a
// JS session. Key format: "{event_type}.{field_name}" e.g. "lus_lock_usage.percent".
const _walkState = new Map();

/**
 * Returns the next smooth value for a numeric metric field.
 * Values spend ~85% of time in [baseline_min, baseline_max], drift gradually
 * toward spike territory (3% chance per tick), and revert via mean reversion.
 * Max step per tick ≈ 2% of the baseline range — no teleporting.
 */
function smoothNext(key, cfg) {
  const baseMin      = cfg.baseline_min   ?? cfg.min;
  const baseMax      = cfg.baseline_max   ?? cfg.max;
  const spikeMax     = cfg.spike_max      ?? baseMax;
  const rareSpikeMax = cfg.rare_spike_max ?? spikeMax;
  const rampSamples  = cfg.spike_ramp_samples ?? 5;
  const center       = (baseMin + baseMax) / 2;

  if (!_walkState.has(key)) _walkState.set(key, center);
  let cur = _walkState.get(key);

  const step = (baseMax - baseMin) * 0.02;
  let next;

  if (Math.random() < 0.03) {
    // Gradual drift toward spike territory over rampSamples ticks
    const target     = spikeMax + Math.random() * (rareSpikeMax - spikeMax);
    const stepToward = (target - cur) / rampSamples;
    next = cur + stepToward;
  } else {
    // Small random walk with gentle mean reversion toward baseline center
    const pull  = (center - cur) * 0.1;
    const noise = (Math.random() * 2 - 1) * step;
    next = cur + pull + noise;
  }

  next = Math.max(cfg.min, Math.min(cfg.max, next));
  _walkState.set(key, next);
  return next;
}

function rr(r) { return ri(r.min, r.max); }
function rf(r) { return Math.random() * (r.max - r.min) + r.min; }

// Weighted template table — weights from observed_prevalence in the YAML reference
const TEMPLATES = [
  { id: 'trans_syncexecute',            weight: 31598 },
  { id: 'trans_onexecute',              weight: 4390  },
  { id: 'svr_accepted_connection',      weight: 2354  },
  { id: 'svradvise_sendevent',          weight: 800   },
  { id: 'lus_lock_usage',               weight: 285   },
  { id: 'stby_transfer_complete',       weight: 185   },
  { id: 'logic_onschedule',             weight: 148   },
  { id: 'datafile_flush_cycle_complete',weight: 34    },
  { id: 'do_minuteop',                  weight: 500   },
  { id: 'general_information_snapshot', weight: 3     },
  { id: 'snapshot_completed',           weight: 1     },
];
const TOTAL_WEIGHT = TEMPLATES.reduce((s, t) => s + t.weight, 0);

function pickTemplate() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const t of TEMPLATES) { r -= t.weight; if (r <= 0) return t.id; }
  return TEMPLATES[0].id;
}

// stby metric block variants (8 options from the YAML)
const STBY_BLOCK_FNS = [
  (i) => `Data ${i()}, Dyn ${i()}, Evt ${i()}, HisRec ${i()}, JnlRec ${i()}`,
  (i) => `Data ${i()}, Dyn ${i()}, Evt ${i()}, HisRec ${i()}, JnlFile ${i()}, JnlRec ${i()}`,
  (i) => `Data ${i()}, Dyn ${i()}, Int ${i()}, Evt ${i()}, HisRec ${i()}, JnlRec ${i()}`,
  (i) => `Data ${i()}, Dyn ${i()}, Int ${i()}, Evt ${i()}, HisRec ${i()}, JnlFile ${i()}, JnlRec ${i()}`,
  (i) => `Data ${i()}, Dyn ${i()}, Int ${i()}, Evt ${i()}, HisRec ${i()}, AlsRec ${i()}, JnlRec ${i()}`,
  (i) => `Data ${i()}, Dyn ${i()}, Int ${i()}, Evt ${i()}, HisRec ${i()}, AlsRec ${i()}, JnlFile ${i()}, JnlRec ${i()}`,
  (i) => `Data ${i()}, Dyn ${i()}, Evt ${i()}, HisRec ${i()}, AlsRec ${i()}, JnlRec ${i()}`,
  (i) => `Cfg ${i()}, Data ${i()}, Dyn ${i()}, Int ${i()}, Evt ${i()}, HisRec ${i()}, JnlFile ${i()}, JnlRec ${i()}`,
];

// Renders a single-line template; returns a string
function renderSingleLine(id, ts, serverName) {
  const t = fmtTs(ts);
  const h = hex4();
  switch (id) {
    case 'trans_syncexecute':
      return `${t} ${h} [TRANS] 0 SyncExecute Time =   ${fmt6dp(smoothNext('trans_syncexecute.seconds', RANGES.trans_syncexecute.seconds))} seconds`;
    case 'trans_onexecute':
      return `${t} ${h} [TRANS] 0 OnExecute Time =   ${fmt6dp(smoothNext('trans_onexecute.seconds', RANGES.trans_onexecute.seconds))} seconds`;
    case 'svr_accepted_connection': {
      const r = RANGES.svr_accepted_connection;
      const ip = () => `192.168.${rr(r.ipOctet)}.${rr(r.ipOctet)}`;
      return `${t} ${h} [SVR] Accepted connection ${rr(r.connection)} from ${ip()}:${rr(r.port)} to ${ip()}:${rr(r.port)} on socket ${hex4()}...`;
    }
    case 'svradvise_sendevent': {
      const r = RANGES.svradvise_sendevent;
      const area = String.fromCharCode(65 + ri(0, 25)) + String.fromCharCode(65 + ri(0, 25));
      return `${t} ${h} [SVRADVISE] ${area}#${rr(r.areaNumber)} SendEvent: EVT_OPCAE_EVENT (${rr(r.bytes)} bytes) to ClientId ${rr(r.clientId)} (${Math.round(smoothNext('svradvise_sendevent.queueCount', r.queueCount))} events queued)`;
    }
    case 'lus_lock_usage':
      return `${t} ${h} [LUS] Lock usage, ${fmt4dp(smoothNext('lus_lock_usage.percent', RANGES.lus_lock_usage.percent))}%, over the last second (diagnostic)`;
    case 'logic_onschedule':
      return `${t} ${h} [LOGIC] OnSchedule() ${Math.round(smoothNext('logic_onschedule.programs', RANGES.logic_onschedule.programs))} programs to process`;
    case 'datafile_flush_cycle_complete': {
      const r = RANGES.datafile_flush_cycle_complete;
      const files = rr(r.files);
      return `${t} ${h} [DATAFILE] Flush cycle complete, flushed ${files} files (${files * rr(r.bytesPerFile)} bytes), time taken ${fmt6dp(smoothNext('datafile_flush_cycle_complete.ms', r.ms))} milliseconds`;
    }
    case 'stby_transfer_complete': {
      const r = RANGES.stby_transfer_complete;
      const blockFn = STBY_BLOCK_FNS[ri(0, STBY_BLOCK_FNS.length - 1)];
      return `${t} ${h} [STBY] 1 Transfer ${rr(r.transfer)} Complete: Time ${fmt3dp(smoothNext('stby_transfer_complete.seconds', r.seconds))} S, ${blockFn(() => Math.round(smoothNext('stby_transfer_complete.record', r.record)))}, ${serverName} `;
    }
    case 'do_minuteop':
      return `${t} ${h} DoMinuteOp() on objects complete`;
    case 'snapshot_completed':
      return `${t} ${h} ...snapshot completed in ${Math.round(smoothNext('snapshot_completed.ms', RANGES.snapshot_completed.ms))} ms.`;
    default:
      return null;
  }
}

// Renders the multi-line general information snapshot block; returns string[]
function renderGeneralInformation(ts, serverName, peerName) {
  const t = fmtTs(ts);
  const g = RANGES.general_information_snapshot;

  const totPhys = g.totalPhysMb.min;  // fixed at 49152
  const avPhys  = Math.min(Math.round(smoothNext('gen.availPhysMb', g.availPhysMb)), totPhys);

  const totPage = rr(g.totalPageMb);
  const avPage  = Math.min(Math.round(smoothNext('gen.availPageMb', g.availPageMb)), totPage);

  const totVirt = rr(g.totalVirtMb);
  const avVirt  = Math.min(Math.round(smoothNext('gen.availVirtMb', g.availVirtMb)), totVirt);

  const workingSetMb     = Math.round(smoothNext('gen.workingSetMb',     g.workingSetMb));
  const peakWorkingSetMb = Math.max(workingSetMb, Math.round(smoothNext('gen.peakWorkingSetMb', g.peakWorkingSetMb)));

  const pageFileMb     = Math.round(smoothNext('gen.pageFileMb',     g.pageFileMb));
  const peakPageFileMb = Math.max(pageFileMb, Math.round(smoothNext('gen.peakPageFileMb', g.peakPageFileMb)));

  const dbObjectsKb = Math.round(smoothNext('gen.dbObjectsKb', g.dbObjectsKb));

  const totDbPts = rr(g.totalDbPoints);
  const dbPts    = Math.min(Math.round(smoothNext('gen.dbPoints', g.dbPoints)), totDbPts);

  const totOpc   = rr(g.totalOpc);
  const opc      = Math.min(Math.round(smoothNext('gen.opc',   g.opc)),   totOpc);

  const totViewx = rr(g.totalViewx);
  const viewx    = Math.min(Math.round(smoothNext('gen.viewx', g.viewx)), totViewx);

  const totWebx  = rr(g.totalWebx);
  const webx     = Math.min(Math.round(smoothNext('gen.webx',  g.webx)),  totWebx);

  const totDac   = rr(g.totalDac);
  const dac      = Math.min(Math.round(smoothNext('gen.dac',   g.dac)),   totDac);

  const pct = (a, b) => ((a / b) * 100).toFixed(1);
  const isMain = Math.random() * 100 < g.isMainPct;
  const stateChangeDt = new Date(ts.getTime() - rr(g.stateChangeOffsetMs));
  const wentMainStr = isMain ? fmtTs(stateChangeDt) : 'Never';
  const stateStr = isMain ? 'Main' : `Standby to "${peerName}"`;
  const licId = Math.random() * 100 < g.licenseIdPresentPct
    ? `${ri(g.licenseIdMin, g.licenseIdMax)} (Quote this for support)`
    : 'None';

  return [
    `${t} 0000 01. General Information`,
    `    EcoStruxure Geo SCADA Expert 2021 on ${serverName}`,
    `    Version ${VERSION_POOL[ri(0, VERSION_POOL.length - 1)]}`,
    `    Copyright © 2005-2024 AVEVA Group Limited or its subsidiaries. All rights reserved.`,
    `    License Site Id: ${licId}`,
    `    June 2024 Update`,
    `    'EVERYONE' HAS ACCESS TO ROOT GROUP.`,
    `    As an additional security measure, please consider removing these permissions.`,
    `    Database Watchdog is enabled; system will restart after a stall is detected.`,
    `    Current State: ${stateStr}`,
    `    State Change Time: ${fmtTs(stateChangeDt)}`,
    `    Time Went Main: ${wentMainStr}`,
    `    Available Physical Memory: ${avPhys} of ${totPhys} MBytes`,
    `    Available Paging File: ${avPage} of ${totPage} MBytes`,
    `    Available Virtual Memory: ${avVirt} of ${totVirt} MBytes`,
    `    Process Working Set Size: ${workingSetMb} MBytes`,
    `    Process Peak Working Set Size: ${peakWorkingSetMb} MBytes`,
    `    Process Page File Usage: ${pageFileMb} MBytes`,
    `    Process Peak Page File Usage: ${peakPageFileMb} MBytes`,
    `    Memory used by database objects: ${dbObjectsKb} KBytes`,
    `    Operating System: ${OS_POOL[ri(0, OS_POOL.length - 1)]}`,
    `    CPU: ${CPU_POOL[ri(0, CPU_POOL.length - 1)]}`,
    `    Registry Root: ${REGISTRY_ROOT_POOL[ri(0, REGISTRY_ROOT_POOL.length - 1)]}`,
    `    License Runtime: Server`,
    `    Database points: ${dbPts} of ${totDbPts} (${pct(dbPts, totDbPts)}%)`,
    `    Data Access Clients: ${dac} of ${totDac} (${pct(dac, totDac)}%)`,
    `    OPC Clients: ${opc} of ${totOpc} (${pct(opc, totOpc)}%)`,
    `    ViewX Clients: ${viewx} of ${totViewx} (${pct(viewx, totViewx)}%)`,
    `    WebX Clients: ${webx} of ${totWebx} (${pct(webx, totWebx)}%)`,
    `    Web Server HTTP Port: ${rr(g.httpPort)}`,
    `    Web Server HTTPS Port: ${rr(g.httpsPort)}`,
    `    Telnet Server: ${Math.random() > 0.5 ? 'Enabled' : 'Disabled'}`,
  ];
}

/**
 * Generate synthetic GeoSCADA log lines.
 *
 * Coverage guarantee: For every minute-bucket of generated timestamps, EACH
 * template fires at least once in deterministic order. This ensures every
 * metric the templates produce gets at least one data point per minute.
 *
 * Algorithm:
 *   1. For each minute bucket, generate a guaranteed-execution schedule:
 *      - Timestamps are spread to ensure at least one event per template per minute
 *      - Templates execute in order (trans_syncexecute, trans_onexecute, etc.)
 *   2. After all templates have executed once, fill remaining time slots with
 *      weighted random selection from TEMPLATES.
 *   3. Continue until 'count' events are generated.
 *
 * @param {number} count     Number of log events to generate
 * @param {object} [opts]
 * @param {number} [opts.startMs]  Start epoch ms (defaults to now minus ~count seconds)
 * @returns {string[]}  Array of log line strings ready for ingestion
 */
export function generateGeoScadaLines(count, { startMs } = {}) {
  const serverIdx = ri(0, SERVER_POOL.length - 1);
  const serverName = SERVER_POOL[serverIdx];
  const peerName   = PEER_POOL[serverIdx];
  const start = startMs ?? (Date.now() - count * 150);
  const lines = [];
  let cursor = start;

  // Build a schedule for the first minute: one guaranteed slot per template,
  // plus weighted slots for the remainder.
  let eventCount = 0;
  let currentBucket = Math.floor(cursor / 60000);
  let templateIndex = 0;  // Next template in round-robin order

  for (let i = 0; i < count; i++) {
    // Move cursor forward by random interval
    cursor += ri(50, 300);
    const ts = new Date(cursor);
    const bucket = Math.floor(cursor / 60000);

    // If we crossed into a new minute bucket, reset the round-robin counter
    // so every template gets a guaranteed slot in the new bucket.
    if (bucket !== currentBucket) {
      currentBucket = bucket;
      templateIndex = 0;
    }

    // Guaranteed round-robin: assign templates in order until all have been
    // assigned once in this minute bucket. After that, use weighted selection.
    let id;
    if (templateIndex < TEMPLATES.length) {
      // Guaranteed slot for this template
      id = TEMPLATES[templateIndex].id;
      templateIndex++;
    } else {
      // All templates assigned; fill remaining slots with weighted random
      id = pickTemplate();
    }

    // Render the template
    if (id === 'general_information_snapshot') {
      lines.push(...renderGeneralInformation(ts, serverName, peerName));
    } else {
      const line = renderSingleLine(id, ts, serverName);
      if (line) lines.push(line);
    }

    eventCount++;
  }

  return lines;
}
