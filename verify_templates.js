// Quick verification script to ensure all templates execute
// Run with: node verify_templates.js

import { generateGeoScadaLines } from './src/modules/geoscada-generator.js';

// Test 1: Small batch (15 events) — should hit all 11 templates at least once
console.log('Test 1: Small batch (15 events)');
const small = generateGeoScadaLines(15);
const smallTemplates = new Set();
small.forEach(line => {
  if (line.includes('[TRANS]')) smallTemplates.add('TRANS');
  if (line.includes('[SVR]')) smallTemplates.add('SVR');
  if (line.includes('[SVRADVISE]')) smallTemplates.add('SVRADVISE');
  if (line.includes('[LUS]')) smallTemplates.add('LUS');
  if (line.includes('[LOGIC]')) smallTemplates.add('LOGIC');
  if (line.includes('[DATAFILE]')) smallTemplates.add('DATAFILE');
  if (line.includes('[STBY]')) smallTemplates.add('STBY');
  if (line.includes('DoMinuteOp')) smallTemplates.add('MINUTEOP');
  if (line.includes('snapshot completed')) smallTemplates.add('SNAPSHOT');
  if (line.includes('General Information')) smallTemplates.add('GENERAL_INFO');
});
console.log(`  Found ${smallTemplates.size} distinct template families:`, Array.from(smallTemplates).sort());
console.log(`  Sample lines (first 5):`);
small.slice(0, 5).forEach(l => console.log(`    ${l}`));

// Test 2: Medium batch (100 events) — all templates should appear multiple times
console.log('\nTest 2: Medium batch (100 events)');
const medium = generateGeoScadaLines(100);
const templateCounts = {};
medium.forEach(line => {
  if (line.includes('SyncExecute')) templateCounts['trans_syncexecute'] = (templateCounts['trans_syncexecute'] || 0) + 1;
  if (line.includes('OnExecute')) templateCounts['trans_onexecute'] = (templateCounts['trans_onexecute'] || 0) + 1;
  if (line.includes('Accepted connection')) templateCounts['svr_accepted_connection'] = (templateCounts['svr_accepted_connection'] || 0) + 1;
  if (line.includes('SendEvent')) templateCounts['svradvise_sendevent'] = (templateCounts['svradvise_sendevent'] || 0) + 1;
  if (line.includes('Lock usage')) templateCounts['lus_lock_usage'] = (templateCounts['lus_lock_usage'] || 0) + 1;
  if (line.includes('OnSchedule')) templateCounts['logic_onschedule'] = (templateCounts['logic_onschedule'] || 0) + 1;
  if (line.includes('Flush cycle')) templateCounts['datafile_flush_cycle_complete'] = (templateCounts['datafile_flush_cycle_complete'] || 0) + 1;
  if (line.includes('Transfer') && line.includes('Complete')) templateCounts['stby_transfer_complete'] = (templateCounts['stby_transfer_complete'] || 0) + 1;
  if (line.includes('DoMinuteOp')) templateCounts['do_minuteop'] = (templateCounts['do_minuteop'] || 0) + 1;
  if (line.includes('snapshot completed')) templateCounts['snapshot_completed'] = (templateCounts['snapshot_completed'] || 0) + 1;
  if (line.includes('General Information')) templateCounts['general_information_snapshot'] = (templateCounts['general_information_snapshot'] || 0) + 1;
});
console.log(`  Template execution counts:`);
Object.entries(templateCounts).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
  console.log(`    ${t}: ${c}`);
});

const allPresent = ['trans_syncexecute', 'trans_onexecute', 'svr_accepted_connection', 'svradvise_sendevent',
                    'lus_lock_usage', 'logic_onschedule', 'datafile_flush_cycle_complete', 'stby_transfer_complete',
                    'do_minuteop', 'snapshot_completed', 'general_information_snapshot']
  .every(t => templateCounts[t] && templateCounts[t] > 0);

console.log(`\n✓ All 11 templates present: ${allPresent ? 'YES' : 'NO'}`);
console.log(`✓ Total lines generated: ${medium.length}`);
