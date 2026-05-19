const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('@jest/globals');

const readFixture = relativePath =>
  fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

test('device detail display pickers keep explicit native styling hooks', () => {
  const source = readFixture('../../../react/pages/DeviceDetailPage.js');
  const styles = readFixture('../../../react/pages/DeviceDetailPage.styles.js');

  assert.match(
    source,
    /selectedValue=\{linkedDisplayId \|\| ''\}[\s\S]*style=\{styles\.picker\}[\s\S]*dropdownIconColor="#64748B"/,
  );
  assert.match(
    source,
    /selectedValue=\{displayPrinterId \|\| ''\}[\s\S]*style=\{styles\.picker\}[\s\S]*dropdownIconColor="#64748B"/,
  );
  assert.match(
    source,
    /selectedValue=\{displaySize\}[\s\S]*style=\{styles\.picker\}[\s\S]*dropdownIconColor="#64748B"/,
  );
  assert.match(
    styles,
    /picker:\s*\{[\s\S]*minHeight:\s*44,[\s\S]*color:\s*'#0F172A'[\s\S]*backgroundColor:\s*'#F8FAFC'/,
  );
});

test('printer device detail pickers keep explicit native styling hooks', () => {
  const source = readFixture('../../../react/pages/PrinterDeviceDetailPage.js');
  const styles = readFixture('../../../react/pages/PrinterDeviceDetailPage.styles.js');

  assert.match(
    source,
    /selectedValue=\{protocol \|\| DEFAULT_NETWORK_CAMERA_PROTOCOL\}[\s\S]*style=\{styles\.picker\}[\s\S]*dropdownIconColor="#64748B"/,
  );
  assert.match(
    source,
    /selectedValue=\{managerDeviceId \|\| ''\}[\s\S]*style=\{styles\.picker\}[\s\S]*dropdownIconColor="#64748B"/,
  );
  assert.match(
    styles,
    /picker:\s*\{[\s\S]*minHeight:\s*44,[\s\S]*color:\s*'#0F172A'[\s\S]*backgroundColor:\s*'#F8FAFC'/,
  );
});
