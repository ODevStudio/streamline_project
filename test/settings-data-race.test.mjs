import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/settings/settings-data.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replaceAll('export ', '');

function createSettingsData(setReaSettings) {
    return new Function(
        'getReaSettings', 'setReaSettings', 'openDB', 'getSetting', 'setSetting',
        `${source}\nreturn { getSnapshot, getPendingReaChanges, updateReaSetting, saveSettingsData };`
    )(
        async () => ({}),
        setReaSettings,
        async () => {},
        async () => undefined,
        async () => undefined
    );
}

test('an edit made during save remains pending', async () => {
    let finish;
    let sent;
    const settings = createSettingsData(changes => {
        sent = changes;
        return new Promise(resolve => { finish = resolve; });
    });

    settings.updateReaSetting('weightFlowMultiplier', 1.1);
    const save = settings.saveSettingsData();
    settings.updateReaSetting('weightFlowMultiplier', 1.2);
    finish();
    await save;

    assert.deepEqual(sent, { weightFlowMultiplier: 1.1 });
    assert.deepEqual(settings.getPendingReaChanges(), { weightFlowMultiplier: 1.2 });
    assert.equal(settings.getSnapshot().rea.weightFlowMultiplier, 1.2);
    assert.equal(settings.getSnapshot().dirty, true);
});
