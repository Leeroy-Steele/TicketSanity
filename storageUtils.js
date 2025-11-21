const CHECKED_ICON_URL = "https://img.icons8.com/color/30/checked-checkbox.png";
const UNCHECKED_ICON_URL = "https://img.icons8.com/ios/30/checked-2--v3.png";

const DEFAULT_TICKET_STATE = Object.freeze({
    isChecked: false,
    checkedDate: null,
    notes: "",
    hideUntil: null,
    isManuallyAddedTask: false,
});

function cloneDefaultState() {
    return { ...DEFAULT_TICKET_STATE };
}

function safeParseJSON(value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
}

function normalizeDateValue(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate.toISOString();
}

function normalizeTicketState(state) {
    if (!state || typeof state !== "object") {
        return cloneDefaultState();
    }

    return {
        isChecked: Boolean(state.isChecked),
        checkedDate: normalizeDateValue(state.checkedDate),
        notes: typeof state.notes === "string" ? state.notes : "",
        hideUntil: normalizeDateValue(state.hideUntil),
        isManuallyAddedTask: Boolean(state.isManuallyAddedTask),
    };
}

function isTicketSanityState(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        (Object.prototype.hasOwnProperty.call(value, "isChecked") ||
            Object.prototype.hasOwnProperty.call(value, "notes") ||
            Object.prototype.hasOwnProperty.call(value, "hideUntil") ||
            Object.prototype.hasOwnProperty.call(value, "isManuallyAddedTask"))
    );
}

function getTicketState(ticketId) {
    if (!ticketId) {
        return cloneDefaultState();
    }

    const rawValue = localStorage.getItem(ticketId);
    if (!rawValue) {
        return cloneDefaultState();
    }

    const parsedValue = safeParseJSON(rawValue);
    if (!parsedValue || !isTicketSanityState(parsedValue)) {
        return cloneDefaultState();
    }

    return normalizeTicketState(parsedValue);
}

function setTicketState(ticketId, state) {
    if (!ticketId) {
        return;
    }

    localStorage.setItem(ticketId, JSON.stringify(normalizeTicketState(state)));
}

function updateTicketState(ticketId, updates) {
    if (!ticketId) {
        return cloneDefaultState();
    }

    const currentState = getTicketState(ticketId);
    const nextState = normalizeTicketState({ ...currentState, ...updates });
    setTicketState(ticketId, nextState);
    return nextState;
}

function clearTicketState(ticketId) {
    if (!ticketId) {
        return;
    }
    localStorage.removeItem(ticketId);
}

function shouldHideTicket(ticketId, providedState) {
    const state = providedState || getTicketState(ticketId);
    if (!state.hideUntil) {
        return false;
    }

    const parsedDate = new Date(state.hideUntil);
    if (Number.isNaN(parsedDate.getTime())) {
        updateTicketState(ticketId, { hideUntil: null });
        return false;
    }

    if (parsedDate > new Date()) {
        return true;
    }

    updateTicketState(ticketId, { hideUntil: null });
    return false;
}

function getAllTicketStateKeys() {
    const ticketKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) {
            continue;
        }
        const rawValue = localStorage.getItem(key);
        const parsedValue = safeParseJSON(rawValue);
        if (parsedValue && isTicketSanityState(parsedValue)) {
            ticketKeys.push(key);
        }
    }
    return ticketKeys;
}

function migrateLegacyLocalStorage() {
    const legacySuffixes = [": Hide Until", ": Notes Field", ": Check Box Url"];
    const legacyKeys = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) {
            continue;
        }

        if (legacySuffixes.some((suffix) => key.endsWith(suffix))) {
            legacyKeys.push(key);
        }
    }

    if (legacyKeys.length === 0) {
        return;
    }

    const aggregatedState = {};

    legacyKeys.forEach((legacyKey) => {
        const [rawTicketId, ...suffixParts] = legacyKey.split(":");
        if (!rawTicketId || suffixParts.length === 0) {
            return;
        }

        const ticketId = rawTicketId.trim();
        const suffix = suffixParts.join(":").trim();
        const value = localStorage.getItem(legacyKey);

        if (!ticketId) {
            return;
        }

        if (!aggregatedState[ticketId]) {
            aggregatedState[ticketId] = cloneDefaultState();
        }

        if (suffix === "Hide Until") {
            aggregatedState[ticketId].hideUntil = normalizeDateValue(value);
        } else if (suffix === "Notes Field") {
            aggregatedState[ticketId].notes = value || "";
        } else if (suffix === "Check Box Url") {
            const isChecked = value === CHECKED_ICON_URL;
            aggregatedState[ticketId].isChecked = isChecked;
            aggregatedState[ticketId].checkedDate = isChecked ? new Date().toISOString() : null;
        }

        localStorage.removeItem(legacyKey);
    });

    Object.entries(aggregatedState).forEach(([ticketId, state]) => {
        setTicketState(ticketId, state);
    });
}

function resetTicketSanityData() {
    try {
        localStorage.clear();
    } catch (error) {
        console.error("TicketSanity: failed to clear localStorage", error);
    }
}

(function initTicketSanityStorage() {
    try {
        migrateLegacyLocalStorage();
    } catch (error) {
        console.error("TicketSanity: failed to migrate legacy storage schema", error);
    }
})();
