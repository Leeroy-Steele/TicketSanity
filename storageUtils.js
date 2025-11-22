const CHECKED_ICON_URL = "https://img.icons8.com/color/30/checked-checkbox.png";
const UNCHECKED_ICON_URL = "https://img.icons8.com/ios/30/checked-2--v3.png";
const MANUAL_TASK_KEY_PREFIX = "Mn-";

const DEFAULT_MANUAL_TASK_FIELDS = Object.freeze({
    title: "",
    status: "",
    priority: "",
});

const DEFAULT_TICKET_STATE = Object.freeze({
    isChecked: false,
    checkedDate: null,
    notes: "",
    hideUntil: null,
    isManuallyAddedTask: false,
    manualTask: null,
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

    const base = cloneDefaultState();
    const normalizedManualTask = state.manualTask ? normalizeManualTaskFields(state.manualTask) : null;

    return {
        ...base,
        ...state,
        isChecked: Boolean(state.isChecked),
        checkedDate: normalizeDateValue(state.checkedDate),
        notes: typeof state.notes === "string" ? state.notes : base.notes,
        hideUntil: normalizeDateValue(state.hideUntil),
        isManuallyAddedTask: state.isManuallyAddedTask === undefined ? base.isManuallyAddedTask : Boolean(state.isManuallyAddedTask),
        manualTask: normalizedManualTask,
    };
}

function normalizeManualTaskFields(fields) {
    if (!fields || typeof fields !== "object") {
        return { ...DEFAULT_MANUAL_TASK_FIELDS };
    }

    return {
        title: typeof fields.title === "string" ? fields.title : DEFAULT_MANUAL_TASK_FIELDS.title,
        status: typeof fields.status === "string" ? fields.status : DEFAULT_MANUAL_TASK_FIELDS.status,
        priority: typeof fields.priority === "string" ? fields.priority : DEFAULT_MANUAL_TASK_FIELDS.priority,
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

function generateManualTaskId() {
    let candidate = null;
    let attempts = 0;

    do {
        const randomNumber = Math.floor(10000 + Math.random() * 90000);
        candidate = `${MANUAL_TASK_KEY_PREFIX}${randomNumber}`;
        attempts += 1;
        if (!localStorage.getItem(candidate)) {
            return candidate;
        }
    } while (attempts < 25);

    return `${MANUAL_TASK_KEY_PREFIX}${Date.now().toString().slice(-5)}`;
}

function isManualTaskKey(key) {
    return typeof key === "string" && key.startsWith(MANUAL_TASK_KEY_PREFIX);
}

function getManualTaskFieldsFromState(state) {
    return normalizeManualTaskFields(state?.manualTask);
}

function updateManualTaskFields(ticketId, fields) {
    if (!ticketId) {
        return null;
    }
    const currentState = getTicketState(ticketId);
    const currentFields = normalizeManualTaskFields(currentState.manualTask);
    const nextFields = normalizeManualTaskFields({ ...currentFields, ...fields });
    return updateTicketState(ticketId, {
        isManuallyAddedTask: true,
        manualTask: nextFields,
    });
}

function getAllManualTaskEntries() {
    return getAllTicketStateKeys()
        .filter((key) => isManualTaskKey(key))
        .map((key) => ({ ticketId: key, state: getTicketState(key) }))
        .filter((entry) => entry.state.isManuallyAddedTask);
}

function resetTicketSanityData() {
    try {
        localStorage.clear();
    } catch (error) {
        console.error("TicketSanity: failed to clear localStorage", error);
    }
}

function resetAllTicketNotes() {
    try {
        const ticketKeys = getAllTicketStateKeys();
        ticketKeys.forEach((key) => updateTicketState(key, { notes: "" }));
    } catch (error) {
        console.error("TicketSanity: failed to clear ticket notes", error);
    }
}

function resetAllTicketChecks() {
    try {
        const ticketKeys = getAllTicketStateKeys();
        ticketKeys.forEach((key) => updateTicketState(key, { isChecked: false, checkedDate: null }));
    } catch (error) {
        console.error("TicketSanity: failed to clear checkbox states", error);
    }
}

(function initTicketSanityStorage() {
    try {
        migrateLegacyLocalStorage();
    } catch (error) {
        console.error("TicketSanity: failed to migrate legacy storage schema", error);
    }
})();
