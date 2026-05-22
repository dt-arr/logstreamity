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
  trans_syncexecute:               { seconds:  { min: 0.000001, max: 0.000100 } },
  trans_onexecute:                 { seconds:  { min: 0.000010, max: 0.001000 } },
  svr_accepted_connection:         { connection: { min: 1, max: 9999 }, port: { min: 1024, max: 65535 }, ipOctet: { min: 1, max: 254 } },
  svradvise_sendevent:             { areaNumber: { min: 1, max: 999 }, bytes: { min: 50, max: 500 }, clientId: { min: 1, max: 99 }, queueCount: { min: 1, max: 5 } },
  lus_lock_usage:                  { percent: { min: 0, max: 100 } },
  logic_onschedule:                { programs: { min: 1, max: 20 } },
  datafile_flush_cycle_complete:   { files: { min: 0, max: 5 }, bytesPerFile: { min: 0, max: 4096 }, ms: { min: 0.001, max: 5.0 } },
  stby_transfer_complete:          { transfer: { min: 1, max: 999 }, seconds: { min: 0.001, max: 10.0 }, record: { min: 0, max: 50000 } },
  snapshot_completed:              { ms: { min: 50, max: 2000 } },
  general_information_snapshot: {
    totalPhysMb:    { min: 32768,  max: 65536  },
    totalPageMb:    { min: 16384,  max: 32768  },
    totalVirtMb:    { min: 131072, max: 524288 },
    workingSetMb:   { min: 500,    max: 2000   },
    pageFileMb:     { min: 200,    max: 1000   },
    dbObjectsKb:    { min: 10000,  max: 500000 },
    totalDbPoints:  { min: 50000,  max: 500000 },
    totalOpc:       { min: 50,     max: 200    },
    totalViewx:     { min: 20,     max: 100    },
    totalWebx:      { min: 20,     max: 100    },
    totalDac:       { min: 20,     max: 100    },
    httpPort:       { min: 8000,   max: 8099   },
    httpsPort:      { min: 8443,   max: 8543   },
    stateChangeOffsetMs: { min: 3600000, max: 604800000 },
    licenseIdPresentPct: 90,
    isMainPct:           50,
    licenseIdMin: 100000,
    licenseIdMax: 999999,
  },
};

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
      return `${t} ${h} [TRANS] 0 SyncExecute Time =   ${fmt6dp(rf(RANGES.trans_syncexecute.seconds))} seconds`;
    case 'trans_onexecute':
      return `${t} ${h} [TRANS] 0 OnExecute Time =   ${fmt6dp(rf(RANGES.trans_onexecute.seconds))} seconds`;
    case 'svr_accepted_connection': {
      const r = RANGES.svr_accepted_connection;
      const ip = () => `192.168.${rr(r.ipOctet)}.${rr(r.ipOctet)}`;
      return `${t} ${h} [SVR] Accepted connection ${rr(r.connection)} from ${ip()}:${rr(r.port)} to ${ip()}:${rr(r.port)} on socket ${hex4()}...`;
    }
    case 'svradvise_sendevent': {
      const r = RANGES.svradvise_sendevent;
      const area = String.fromCharCode(65 + ri(0, 25)) + String.fromCharCode(65 + ri(0, 25));
      return `${t} ${h} [SVRADVISE] ${area}#${rr(r.areaNumber)} SendEvent: EVT_OPCAE_EVENT (${rr(r.bytes)} bytes) to ClientId ${rr(r.clientId)} (${rr(r.queueCount)} events queued)`;
    }
    case 'lus_lock_usage':
      return `${t} ${h} [LUS] Lock usage, ${fmt4dp(rf(RANGES.lus_lock_usage.percent))}%, over the last second (diagnostic)`;
    case 'logic_onschedule':
      return `${t} ${h} [LOGIC] OnSchedule() ${rr(RANGES.logic_onschedule.programs)} programs to process`;
    case 'datafile_flush_cycle_complete': {
      const r = RANGES.datafile_flush_cycle_complete;
      const files = rr(r.files);
      return `${t} ${h} [DATAFILE] Flush cycle complete, flushed ${files} files (${files * rr(r.bytesPerFile)} bytes), time taken ${fmt6dp(rf(r.ms))} milliseconds`;
    }
    case 'stby_transfer_complete': {
      const r = RANGES.stby_transfer_complete;
      const blockFn = STBY_BLOCK_FNS[ri(0, STBY_BLOCK_FNS.length - 1)];
      return `${t} ${h} [STBY] 1 Transfer ${rr(r.transfer)} Complete: Time ${fmt3dp(rf(r.seconds))} S, ${blockFn(() => rr(r.record))}, ${serverName} `;
    }
    case 'do_minuteop':
      return `${t} ${h} DoMinuteOp() on objects complete`;
    case 'snapshot_completed':
      return `${t} ${h} ...snapshot completed in ${rr(RANGES.snapshot_completed.ms)} ms.`;
    default:
      return null;
  }
}

// Renders the multi-line general information snapshot block; returns string[]
function renderGeneralInformation(ts, serverName, peerName) {
  const t = fmtTs(ts);
  const g = RANGES.general_information_snapshot;
  const totPhys = rr(g.totalPhysMb); const avPhys = ri(Math.floor(totPhys * 0.25), totPhys);
  const totPage = rr(g.totalPageMb); const avPage = ri(Math.floor(totPage * 0.25), totPage);
  const totVirt = rr(g.totalVirtMb); const avVirt = ri(Math.floor(totVirt * 0.5),  totVirt);
  const totDbPts = rr(g.totalDbPoints); const dbPts = ri(Math.floor(totDbPts * 0.2), totDbPts);
  const totOpc   = rr(g.totalOpc);   const opc   = ri(0, totOpc);
  const totViewx = rr(g.totalViewx); const viewx = ri(0, totViewx);
  const totWebx  = rr(g.totalWebx);  const webx  = ri(0, totWebx);
  const totDac   = rr(g.totalDac);   const dac   = ri(0, totDac);
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
    `    Copyright \u00A9 2005-2024 AVEVA Group Limited or its subsidiaries. All rights reserved.`,
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
    `    Process Working Set Size: ${rr(g.workingSetMb)} MBytes`,
    `    Process Peak Working Set Size: ${rr(g.workingSetMb)} MBytes`,
    `    Process Page File Usage: ${rr(g.pageFileMb)} MBytes`,
    `    Process Peak Page File Usage: ${rr(g.pageFileMb)} MBytes`,
    `    Memory used by database objects: ${rr(g.dbObjectsKb)} KBytes`,
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
