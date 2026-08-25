import { openDB, getSetting, setSetting } from './idb.js';

// Temperature-unit preference. The machine and Rea Prime always speak
// Celsius on the wire — this is a pure display-layer conversion, never
// persisted or sent anywhere except this skin-local preference.
const TEMP_UNIT_KEY = 'tempUnit';
let currentTempUnit = 'C';

function afterFirstPaint(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
}

export function celsiusToFahrenheit(c) {
    return (c * 9 / 5) + 32;
}

export function fahrenheitToCelsius(f) {
    return (f - 32) * 5 / 9;
}

/** @returns {'C'|'F'} */
export function getTempUnit() {
    return currentTempUnit;
}

/**
 * Sets the temperature-unit preference and notifies listeners.
 * @param {'C'|'F'} unit
 */
export function setTempUnit(unit) {
    currentTempUnit = unit === 'F' ? 'F' : 'C';
    // Write to both — IDB survives WebView process kills on iOS, localStorage is sync fallback
    localStorage.setItem(TEMP_UNIT_KEY, currentTempUnit);
    setSetting(TEMP_UNIT_KEY, currentTempUnit).catch(() => {});
    document.dispatchEvent(new CustomEvent('streamline:unitchange', { detail: { unit: currentTempUnit } }));
}

/**
 * Formats a raw Celsius value for display in the current unit preference.
 * @param {number} celsius
 * @param {number} decimals
 * @returns {string} e.g. "93.2°c" or "199.8°F", or '-' for a non-finite input
 */
export function formatTemp(celsius, decimals = 1) {
    if (typeof celsius !== 'number' || !isFinite(celsius)) return '-';
    return currentTempUnit === 'F'
        ? `${celsiusToFahrenheit(celsius).toFixed(decimals)}°F`
        : `${celsius.toFixed(decimals)}°c`;
}

/**
 * Converts a value the user entered/sees in the CURRENT display unit back to
 * canonical Celsius. Inverse of formatTemp's number. Every writer (target
 * temps sent to Rea Prime) must receive Celsius — call this at the input edge.
 * @param {number} displayValue
 * @returns {number}
 */
export function fromDisplayTemp(displayValue) {
    return currentTempUnit === 'F' ? fahrenheitToCelsius(displayValue) : displayValue;
}

/**
 * Converts a whole-unit step size (e.g. "1 degree") in the CURRENT display
 * unit to the equivalent Celsius delta, so +/- buttons feel like a 1-degree
 * step in whichever unit is showing rather than a fixed 1°C jump that reads
 * as 1.8°F. A delta has no +32 offset — only the 5/9 scale applies.
 * @param {number} displayStep
 * @returns {number}
 */
export function displayStepToCelsius(displayStep) {
    return currentTempUnit === 'F' ? displayStep * 5 / 9 : displayStep;
}

/**
 * Rounds a Celsius bound (e.g. a hardware min/max) to a whole number in the
 * current display unit — for numpad/clamp bounds, not live readings.
 * @param {number} celsius
 * @returns {number}
 */
export function boundToDisplay(celsius) {
    return Math.round(currentTempUnit === 'F' ? celsiusToFahrenheit(celsius) : celsius);
}

export function initUnits() {
    const saved = localStorage.getItem(TEMP_UNIT_KEY);
    const initialUnit = saved === 'F' ? 'F' : 'C';
    currentTempUnit = initialUnit;
    localStorage.setItem(TEMP_UNIT_KEY, currentTempUnit);

    afterFirstPaint(async () => {
        let savedInIdb = null;
        try {
            await openDB();
            savedInIdb = await getSetting(TEMP_UNIT_KEY);
        } catch (_) {}

        // Do not overwrite a preference the user changed while reconciliation ran.
        const localNow = localStorage.getItem(TEMP_UNIT_KEY);
        const normalizedLocal = localNow === 'F' ? 'F' : 'C';
        const localChanged = normalizedLocal !== initialUnit;
        const validIdbUnit = savedInIdb === 'C' || savedInIdb === 'F';
        const reconciledUnit = localChanged
            ? normalizedLocal
            : (validIdbUnit ? savedInIdb : initialUnit);

        if (reconciledUnit !== currentTempUnit) {
            currentTempUnit = reconciledUnit;
            localStorage.setItem(TEMP_UNIT_KEY, currentTempUnit);
            document.dispatchEvent(new CustomEvent('streamline:unitchange', { detail: { unit: currentTempUnit } }));
        }
        setSetting(TEMP_UNIT_KEY, currentTempUnit).catch(() => {});
    });
}
