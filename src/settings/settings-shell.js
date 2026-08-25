import * as ui from '../modules/ui.js';
import { translatePage } from '../modules/i18n.js';
import { loadPage } from '../modules/router.js';
import { isBengleMachine } from '../modules/machine.js';
import {
    resetSettingsSession,
    saveSettingsData,
    startSettingsData
} from './settings-data.js';

const SETTINGS_TREE = Object.freeze({
    quickadjustments: Object.freeze([
        ['Flow Multiplier', 'flowmultiplier'],
        ['Steam', 'steam'],
        ['Hot Water', 'hotwater'],
        ['Water Tank', 'watertank'],
        ['Flush', 'flush'],
        ['Machine Advanced Settings', 'de1advanced']
    ]),
    bluetooth: Object.freeze([
        ['1. Machine', 'ble_machine'],
        ['2. Scale', 'ble_scale']
    ]),
    calibration: Object.freeze([
        ['Default load settings', 'calib_defaultload'],
        ['Refill Kit', 'calib_refillkit'],
        ['Voltage', 'calib_voltage'],
        ['Fan', 'calib_fan'],
        ['Steam', 'calib_steam'],
        ['Load Cells', 'calib_loadcell', true]
    ]),
    machine: Object.freeze([
        ['USB', 'usbchargermode'],
        ['Cup Warmer', 'cupwarmer', true],
        ['Lighting', 'ledstrip', true],
        ['Machine Information', 'machineinfo']
    ]),
    maintenance: Object.freeze([
        ['Machine Descaling', 'maint_descaling'],
        ['Transport Mode', 'maint_airpurge']
    ]),
    skin: Object.freeze([['Theme & Updates', 'appearance']]),
    language: Object.freeze([['Select Language', 'language']]),
    extensions: Object.freeze([
        ['Visualizer', 'extensions'],
        ['Shot Uploader', 'shotupload'],
        ['Plugins', 'plugins'],
        ['DYE2', 'dye2']
    ]),
    miscellaneous: Object.freeze([
        ['Decaid Settings', 'rea'],
        ['Brightness', 'brightness'],
        ['Wake Lock', 'wakelock'],
        ['Presence Detection', 'presence'],
        ['Display Size', 'fontsize'],
        ['Temperature', 'tempunit'],
        ['Screen Saver', 'screensaver'],
        ['Keyboard Shortcuts', 'keyboard_shortcuts'],
        ['Home Assistant', 'homeassistant']
    ]),
    updates: Object.freeze([['Firmware Update', 'firmware']]),
    usermanual: Object.freeze([
        ['Quick Start Guide', 'quickstart'],
        ['Talk to Decent', 'talkdecent'],
        ['Send Feedback', 'feedback']
    ])
});

const CATEGORY_LOADERS = Object.freeze({
    quickadjustments: () => import('./categories/quick-adjustments.js'),
    bluetooth: () => import('./categories/legacy-category.js'),
    calibration: () => import('./categories/legacy-category.js'),
    machine: () => import('./categories/legacy-category.js'),
    maintenance: () => import('./categories/legacy-category.js'),
    skin: () => import('./categories/legacy-category.js'),
    language: () => import('./categories/legacy-category.js'),
    extensions: () => import('./categories/legacy-category.js'),
    miscellaneous: () => import('./categories/legacy-category.js'),
    updates: () => import('./categories/legacy-category.js'),
    usermanual: () => import('./categories/legacy-category.js')
});

let currentRoot = null;
let currentCleanup = null;
let activeMainCategory = 'quickadjustments';
let renderSequence = 0;
let legacyMounted = false;

function setActive(buttons, activeButton) {
    buttons.forEach(button => {
        const active = button === activeButton;
        button.classList.toggle('text-white', active);
        button.classList.toggle('bg-[#2c4a7a]', active);
        button.classList.toggle('text-[#959595]', !active);
    });
}

function availableSubcategories(mainCategory) {
    return (SETTINGS_TREE[mainCategory] || []).filter(([, , bengleOnly]) => !bengleOnly || isBengleMachine());
}

function renderSubcategories(mainCategory, searchTerm = '') {
    const panel = document.getElementById('sub-categories-panel');
    if (!panel) return;
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    const items = availableSubcategories(mainCategory).filter(([name]) =>
        !normalizedSearch || name.toLocaleLowerCase().includes(normalizedSearch)
    );
    panel.innerHTML = `<ul class="space-y-1">${items.map(([name, category]) => {
        const prefix = name.match(/^(\d+\.\s*)/)?.[1] || '';
        const label = prefix ? name.slice(prefix.length) : name;
        return `<li><button class="settings-subnav-btn w-full text-left px-4 py-3 rounded-lg text-[24px] text-[#959595] hover:text-white hover:bg-[#2c4a7a] flex items-center" data-category="${category}">${prefix}<span data-i18n-key="${label}">${label}</span></button></li>`;
    }).join('')}</ul>`;
    translatePage();
}

function renderSkeleton() {
    const content = document.getElementById('settings-content-area');
    if (!content) return null;
    content.innerHTML = `
        <div class="flex flex-col gap-[28px] w-full" role="status" aria-busy="true">
            <div class="h-[44px] w-[42%] mx-auto rounded-[6px] bg-[var(--profile-button-background-color)]"></div>
            <div class="h-px w-full bg-[var(--border-color)]"></div>
            <div class="h-[190px] w-[590px] mx-auto rounded-[6px] bg-[var(--profile-button-background-color)]"></div>
            <div class="h-[190px] w-[590px] mx-auto rounded-[6px] bg-[var(--profile-button-background-color)]"></div>
            <span class="sr-only">Loading settings</span>
        </div>`;
    return content;
}

async function renderCategory(mainCategory, category) {
    activeMainCategory = mainCategory;
    currentCleanup?.();
    currentCleanup = null;
    const content = renderSkeleton();
    if (!content) return;
    const sequence = ++renderSequence;
    try {
        const module = await CATEGORY_LOADERS[mainCategory]();
        if (sequence !== renderSequence) return;
        currentCleanup = await module.mountSettingsCategory({
            container: content,
            mainCategory,
            category,
            activateLegacy: () => {
                legacyMounted = true;
            }
        });
    } catch (error) {
        if (sequence !== renderSequence) return;
        content.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-[24px]" role="alert"><p class="text-red-500 text-[24px]">Failed to load settings</p><button type="button" data-retry-category class="bg-[#385a92] h-[72px] px-[48px] rounded-[10px] text-white text-[24px] font-bold">Retry</button></div>`;
        content.querySelector('[data-retry-category]')?.addEventListener('click', () => renderCategory(mainCategory, category), { once: true });
    }
}

function selectMainCategory(button, searchTerm = '') {
    const mainCategory = button.id.replace(/-btn$/, '').replaceAll('-', '');
    activeMainCategory = mainCategory;
    setActive(Array.from(document.querySelectorAll('.settings-nav-btn')), button);
    renderSubcategories(mainCategory, searchTerm);
    const first = document.querySelector('#sub-categories-panel .settings-subnav-btn');
    if (first) {
        first.click();
    } else {
        const content = document.getElementById('settings-content-area');
        if (content) content.innerHTML = '<div class="flex items-center justify-center h-full text-[28px] text-[var(--text-primary)]">No matching settings</div>';
    }
}

function bindShell(root) {
    root.addEventListener('click', event => {
        if (legacyMounted) return;
        const mainButton = event.target.closest('.settings-nav-btn');
        if (mainButton) {
            selectMainCategory(mainButton, document.getElementById('settings-search')?.value || '');
            return;
        }
        const subButton = event.target.closest('.settings-subnav-btn');
        if (subButton) {
            setActive(Array.from(document.querySelectorAll('.settings-subnav-btn')), subButton);
            renderCategory(activeMainCategory, subButton.dataset.category);
        }
    });

    document.getElementById('settings-search')?.addEventListener('input', event => {
        if (legacyMounted) return;
        const term = event.target.value.trim().toLocaleLowerCase();
        document.querySelectorAll('.settings-nav-btn').forEach(button => {
            const mainCategory = button.id.replace(/-btn$/, '').replaceAll('-', '');
            const matches = button.textContent.toLocaleLowerCase().includes(term)
                || availableSubcategories(mainCategory).some(([name]) => name.toLocaleLowerCase().includes(term));
            button.closest('li').style.display = !term || matches ? '' : 'none';
        });
        renderSubcategories(activeMainCategory, term);
    });

    document.getElementById('cancel-settings-btn')?.addEventListener('click', () => {
        if (legacyMounted) return;
        resetSettingsSession();
        loadPage('index.html');
    });

    document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
        if (legacyMounted) return;
        try {
            await saveSettingsData();
            ui.showToast('Settings updated', 3000, 'success');
            loadPage('index.html');
        } catch (error) {
            ui.showToast(`Failed to save settings: ${error.message}`, 5000, 'error');
        }
    });
}

export async function initializeSettingsShell() {
    const root = document.getElementById('settings-body')?.parentElement;
    if (!root || root === currentRoot) return;
    currentCleanup?.();
    currentRoot = root;
    currentCleanup = null;
    activeMainCategory = 'quickadjustments';
    legacyMounted = false;
    resetSettingsSession();
    startSettingsData();
    bindShell(root);
    const first = document.getElementById('quickadjustments-btn') || document.querySelector('.settings-nav-btn');
    if (first) selectMainCategory(first);
    translatePage();
}
