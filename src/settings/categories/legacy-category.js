import { getPendingReaChanges } from '../settings-data.js';

export async function mountSettingsCategory(context) {
    context.activateLegacy();
    const { initializeSettings } = await import('../settings.js');
    await initializeSettings({
        initialMainCategory: context.mainCategory,
        initialCategory: context.category,
        initialReaChanges: getPendingReaChanges()
    });
    return () => {};
}
