// Script for manipulating table / ticket results -->

// Sort tickets by Priority / board / Status
let sortAscendingOrder = true;
function escapeAttributeValue(value) {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isManualTaskRow(row) {
    return Boolean(row && row.classList && row.classList.contains("manualTask"));
}

function getManualFieldValue(row, fieldName) {
    if (!isManualTaskRow(row)) {
        return null;
    }
    const input = row.querySelector(`[data-manual-field="${fieldName}"]`);
    return input ? input.value.trim() : "";
}

function getColumnValue(row, columnName, columnIndex) {
    if (!row) {
        return "";
    }

    if (isManualTaskRow(row)) {
        if (columnName === "Status") {
            return getManualFieldValue(row, "status");
        }
        if (columnName === "P") {
            return getManualFieldValue(row, "priority");
        }
        if (columnName === "Board") {
            return "Manual Task";
        }
    }

    const cell = row.cells[columnIndex];
    if (!cell) {
        return "";
    }
    return cell.innerText ? cell.innerText.trim() : "";
}

function sortTableRows(columnName, sortOrder, sortDirection) {
    const table = document.getElementById("resultsTable");
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody?.rows || []);

    if (rows.length === 0) {
        console.error("No rows found in the table body.");
        return;
    }

    // Map column names to indices (adjust indices to match your table)
    const columnMapping = {
        Board: 5,
        Status: 6,
        P: 7,
    };
    const columnIndex = columnMapping[columnName]; // This will take in the sort by columnName and return a columnMapping number (6,7,8)

    if (columnIndex === undefined) {
        console.error(`Invalid column name: "${columnName}".`);
        return;
    }

    // Sort rows by the specified column
    rows.sort((rowA, rowB) => {
        const valueA = getColumnValue(rowA, columnName, columnIndex);
        const valueB = getColumnValue(rowB, columnName, columnIndex);

        // Handle numeric sorting for the "P" column
        if (columnName === "P") {
            if (sortDirection === "decending") {
                sortAscendingOrder = true;
            }

            const numA = parseFloat(valueA) || 0; // Convert to number or default to 0
            const numB = parseFloat(valueB) || 0;

            // Sort numerically
            return sortAscendingOrder ? numA - numB : numB - numA;
        }

        if (columnName === "Status") {
            const manualBlankA = isManualTaskRow(rowA) && valueA.length === 0;
            const manualBlankB = isManualTaskRow(rowB) && valueB.length === 0;

            if (manualBlankA !== manualBlankB) {
                return manualBlankA ? -1 : 1;
            }
        }

        // Testing this *****************************
        if (sortOrder) {
            const indexA = sortOrder.indexOf(valueA);
            const indexB = sortOrder.indexOf(valueB);

            // If a status is not in sortOrder, move it to the end (assign a large index)
            return (indexA === -1 ? sortOrder.length : indexA) - (indexB === -1 ? sortOrder.length : indexB);
        }

        // Default to text sorting
        return sortAscendingOrder ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });

    // Append sorted rows back to tbody
    rows.forEach((row) => tbody.appendChild(row));
    sortAscendingOrder = !sortAscendingOrder;
}

// for the tick option on each ticket row. Changes image to tick / box
function tickBox(divID) {
    const targetImg = document.getElementById(`${divID}`);
    if (!targetImg) {
        return;
    }

    if (targetImg.src.includes(UNCHECKED_ICON_URL)) {
        targetImg.src = CHECKED_ICON_URL;
    } else {
        targetImg.src = UNCHECKED_ICON_URL;
    }
}

// Hide by source (Jirta / Tickets)
function hideRowsbyDataSource(source) {
    unhideAll();
    const table = document.getElementById("resultsTable");
    const tbody = table.tBodies[0];
    const rows = tbody?.rows || [];

    if (source === "Lancom Button") {
        Array.from(rows).forEach((row) => {
            if (row.classList.contains("ticketRow")) {
                row.style.display = "none"; // Hide the row
            }
        });
    } else if (source === "Jira") {
        Array.from(rows).forEach((row) => {
            if (row.classList.contains("jiraRow")) {
                row.style.display = "none"; // Hide the row
            }
        });
    }
}

function showOnlyOfflineTasks() {
    unhideAll();
    const table = document.getElementById("resultsTable");
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody?.rows || []);

    if (rows.length === 0) {
        return;
    }

    rows.forEach((row) => {
        const ticketId = row.dataset.ticketId || "";
        const isOfflineRow = typeof ticketId === "string" && ticketId.startsWith(MANUAL_TASK_KEY_PREFIX);
        if (!isOfflineRow) {
            row.style.display = "none";
            return;
        }

        const state = getTicketState(ticketId);
        const isHidden = shouldHideTicket(ticketId, state);
        row.style.display = isHidden ? "none" : "";
    });
}

// hide by Status
function hideRowsWithStatus(statusToHide) {
    const table = document.getElementById("resultsTable");
    const tbody = table.tBodies[0];
    const rows = tbody?.rows || [];

    if (statusToHide === "Waiting on Client") {
        Array.from(rows).forEach((row) => {
            let statusCell = row.cells[6]; // Index of the Status column
            if (statusCell === undefined) {
                statusCell = row.cells[2];
            }

            if (
                (statusCell && statusCell.innerText.trim() === "Waiting on client") ||
                statusCell.innerText.trim() === "Waiting on Client" ||
                statusCell.innerText.trim() === "No response from client" ||
                statusCell.innerText.trim() === "No Response from client" ||
                statusCell.innerText.trim() === "Waiting Client Response"
            ) {
                row.style.display = "none"; // Hide the row
            }
        });
    } else if (statusToHide === "Waiting on 3rd Party") {
        Array.from(rows).forEach((row) => {
            let statusCell = row.cells[6]; // Index of the Status column
            if (statusCell === undefined) {
                statusCell = row.cells[2];
            }

            if (statusCell && statusCell.innerText.trim() === "Waiting on 3rd Party") {
                row.style.display = "none"; // Hide the row
            }
        });
    } else if (statusToHide === "Waiting on Dev") {
        Array.from(rows).forEach((row) => {
            let statusCell = row.cells[6]; // Index of the Status column
            if (statusCell === undefined) {
                statusCell = row.cells[2];
            }
            if (
                (statusCell && statusCell.innerText.trim() === "Waiting on Development") ||
                statusCell.innerText.trim() === "Waiting on Developer" ||
                statusCell.innerText.trim() === "Waiting on Development - Backlog" ||
                statusCell.innerText.trim() === "Waiting on Development - In Progress"
            ) {
                row.style.display = "none"; // Hide the row
            }
        });
    } else if (statusToHide === "Waiting on Dev Only") {
        unhideAll();
        Array.from(rows).forEach((row) => {
            const statusCell = row.cells[6]; // Index of the Status column
            if (
                statusCell &&
                statusCell.innerText.trim() !== "Waiting on Development" &&
                statusCell.innerText.trim() !== "Waiting on Developer" &&
                statusCell.innerText.trim() !== "Waiting on Development - Backlog" &&
                statusCell.innerText.trim() !== "Waiting on Development - In Progress"
            ) {
                row.style.display = "none"; // Hide the row
            }
        });
    }
}

function hideTicketsNotFromBoard(boardToShow, options = {}) {
    const { skipUnhide = false } = options || {};

    if (!skipUnhide) {
        unhideAll();
    }

    const table = document.getElementById("resultsTable");
    const tbody = table.tBodies[0];
    const rows = tbody?.rows || [];

    if (boardToShow === PrimaryBoard1?.BoardName) {
        Array.from(rows).forEach((row) => {
            if (isManualTaskRow(row)) {
                row.style.display = "none";
                return;
            }
            const boardCell = row.cells[5]; // Index of the Status column
            if (boardCell && boardCell.innerText.trim().substring(0, 6) !== PrimaryBoard1?.BoardName.substring(0, 6)) {
                row.style.display = "none"; // Hide the row
            }
        });
    } else if (boardToShow === PrimaryBoard2?.BoardName) {
        Array.from(rows).forEach((row) => {
            if (isManualTaskRow(row)) {
                row.style.display = "none";
                return;
            }
            const boardCell = row.cells[5]; // Index of the Status column
            if (boardCell && boardCell.innerText.trim().substring(0, 6) !== PrimaryBoard2?.BoardName.substring(0, 6)) {
                row.style.display = "none"; // Hide the row
            }
        });
    }
}

function showActionableAllBoards() {
    unhideAll();
    organiseMyList();
}

function showActionableBoard(boardName) {
    if (!boardName) {
        return;
    }
    unhideAll();
    organiseMyList();
    hideTicketsNotFromBoard(boardName, { skipUnhide: true });
}

// Drag and drop table rows
let draggedRow = null;

function drag(ev) {
    draggedRow = ev.target;
    ev.target.classList.add("dragging");
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drop(ev) {
    ev.preventDefault();
    const droppedRow = ev.target.closest("tr");
    if (draggedRow && droppedRow && draggedRow !== droppedRow) {
        const rows = Array.from(droppedRow.parentNode.children);
        const draggedIndex = rows.indexOf(draggedRow);
        const droppedIndex = rows.indexOf(droppedRow);

        if (draggedIndex < droppedIndex) {
            droppedRow.after(draggedRow);
        } else {
            droppedRow.before(draggedRow);
        }
    }
    draggedRow.classList.remove("dragging");
}

// Manually add table rows
function addRow(manualTaskEntry = null) {
    const tableBody = document.getElementById("resultsTable").getElementsByTagName("tbody")[0];

    let ticketId;
    let state;

    if (manualTaskEntry && manualTaskEntry.ticketId && manualTaskEntry.state) {
        ticketId = manualTaskEntry.ticketId;
        state = manualTaskEntry.state;
    } else {
        ticketId = generateManualTaskId();
        state = updateTicketState(ticketId, {
            isManuallyAddedTask: true,
            manualTask: { ...DEFAULT_MANUAL_TASK_FIELDS },
            notes: "",
            isChecked: false,
            checkedDate: null,
        });
    }

    const manualFields = getManualTaskFieldsFromState(state);
    const checkboxSrc = state.isChecked ? CHECKED_ICON_URL : UNCHECKED_ICON_URL;
    const notesValue = state.notes || "";
    const titleValue = escapeAttributeValue(manualFields.title);
    const statusValue = escapeAttributeValue(manualFields.status);
    const priorityValue = escapeAttributeValue(manualFields.priority);
    const notesAttrValue = escapeAttributeValue(notesValue);

    const newRow = document.createElement("tr");
    newRow.classList.add("manualTask");
    newRow.setAttribute("draggable", "true");
    newRow.setAttribute("ondragstart", "drag(event)");
    newRow.setAttribute("ondragover", "allowDrop(event)");
    newRow.setAttribute("ondrop", "drop(event)");
    newRow.dataset.ticketId = ticketId;
    newRow.id = "row-" + ticketId;

    newRow.innerHTML = `
            <td colspan="6" class="p-1 border border-gray-200"><input type="text" data-manual-field="title" placeholder="Task" class="w-full border rounded p-1" value="${titleValue}" /></td>
            <td style="width: 50px;" class="p-1 text-center border border-gray-200"><input type="text" data-manual-field="status" placeholder="..." class="w-full border rounded p-1" value="${statusValue}" /></td>
            <td style="width: 50px;" class="p-1 text-center border border-gray-200"><input style="width: 35px;" type="text" data-manual-field="priority" placeholder="..." class="border rounded p-1" value="${priorityValue}" /></td>

            <td class="py-1 px-2 text-center meeting-notes border border-gray-200 span">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div>
                        <img width="30" height="30" src="${checkboxSrc}" alt="checked-2--v3" />
                    </div>
                    <input type="text" class="w-full p-1 border rounded" placeholder="..." value="${notesAttrValue}" />
                </div>
            </td>

            <td class="p-1 text-center border border-gray-200 action-buttons">
                <button onclick="deleteRow('${ticketId}')" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>
                <button onclick="hideRow('${ticketId}')" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">Hide</button>
            </td>
        `;

    tableBody.appendChild(newRow);
    attachManualTaskFieldListeners(newRow);
    attachRowInteractionHandlers(newRow);
}

function attachManualTaskFieldListeners(row) {
    if (!row || row.dataset.manualFieldsBound === "true") {
        return;
    }

    const ticketId = row.dataset.ticketId;
    if (!ticketId) {
        return;
    }

    const manualInputs = row.querySelectorAll("[data-manual-field]");
    manualInputs.forEach((input) => {
        input.addEventListener("input", function () {
            const fieldName = input.getAttribute("data-manual-field");
            if (!fieldName) {
                return;
            }
            updateManualTaskFields(ticketId, { [fieldName]: input.value || "" });
        });
    });

    row.dataset.manualFieldsBound = "true";
}

function restoreManualTasks() {
    const manualEntries = getAllManualTaskEntries();
    if (!manualEntries || manualEntries.length === 0) {
        return;
    }
    manualEntries.forEach((entry) => addRow(entry));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreManualTasks);
} else {
    restoreManualTasks();
}

function hideRow(index) {
    document.getElementById("row-" + index).style.display = "none";
}

function deleteRow(index) {
    const row = document.getElementById("row-" + index);
    if (!row) {
        return;
    }

    const ticketId = row.dataset.ticketId;
    if (ticketId) {
        clearTicketState(ticketId);
    }

    row.remove();
}

// Hide for a day (TBC)
function hideForADay(index) {
    // Get innerHTML row from table
    const row = document.getElementById("row-" + index);
    if (!row) {
        return;
    }

    const ticketId = row.dataset.ticketId;
    if (!ticketId) {
        row.style.display = "none";
        return;
    }

    const date = new Date();
    date.setHours(date.getHours() + 12); // Add 12 hours (0.5 days)

    updateTicketState(ticketId, { hideUntil: date.toISOString() });

    // hide row
    document.getElementById("row-" + index).style.display = "none";
}

function unhideAll() {
    const rows = document.querySelectorAll("#resultsTable tbody tr");
    rows.forEach((row) => {
        if (!row) {
            return;
        }

        const ticketId = row.dataset.ticketId;
        if (!ticketId) {
            row.style.display = "";
            return;
        }

        const state = getTicketState(ticketId);
        const isHidden = shouldHideTicket(ticketId, state);
        row.style.display = isHidden ? "none" : "";
    });
}

function organiseMyList() {
    hideRowsWithStatus("Waiting on Client");
    hideRowsWithStatus("Waiting on Dev");
    hideRowsWithStatus("Waiting on 3rd Party");
    sortTableRows("Status", [
        "New",
        "ReOpened*",
        "Client responded",
        "Client Responded",
        "In Progress",
        "In Progress - Do Not Send Email",
        "Testing",
        "Ready for QA",
        "Scheduled",
    ]);
}

function organiseMyLisByPriority() {
    hideRowsWithStatus("Waiting on Client");
    hideRowsWithStatus("Waiting on Dev");
    hideRowsWithStatus("Waiting on 3rd Party");
    sortTableRows("Status", [
        "New",
        "ReOpened*",
        "Client responded",
        "Client Responded",
        "In Progress",
        "In Progress - Do Not Send Email",
        "Testing",
        "Ready for QA",
        "Scheduled",
        "Assigned",
    ]);
    sortTableRows("P", null, "decending");
}

function clearAllSavedTicketData() {
    const confirmed = window.confirm("This will remove all saved notes, checkbox states, and hidden ticket data. Continue?");
    if (!confirmed) {
        return;
    }

    resetTicketSanityData();

    const rows = document.querySelectorAll("#resultsTable tbody tr");
    rows.forEach((row) => {
        const notesInput = row.querySelector(".meeting-notes input");
        if (notesInput) {
            notesInput.value = "";
        }

        const imageElement = row.querySelector(".meeting-notes img");
        if (imageElement) {
            imageElement.src = UNCHECKED_ICON_URL;
        }
    });

    const manualRows = document.querySelectorAll("#resultsTable tbody tr.manualTask");
    manualRows.forEach((row) => row.remove());

    alert("All saved ticket data has been cleared.");
}

function clearAllTicketNotes() {
    const confirmed = window.confirm("This will remove every saved note for your tickets. Continue?");
    if (!confirmed) {
        return;
    }

    resetAllTicketNotes();

    const rows = document.querySelectorAll("#resultsTable tbody tr");
    rows.forEach((row) => {
        const notesInput = row.querySelector(".meeting-notes input");
        if (notesInput) {
            notesInput.value = "";
        }
    });

    alert("All saved ticket notes have been cleared.");
}

function clearAllTicketChecks() {
    const confirmed = window.confirm("This will uncheck every saved checkbox. Continue?");
    if (!confirmed) {
        return;
    }

    resetAllTicketChecks();

    const rows = document.querySelectorAll("#resultsTable tbody tr");
    rows.forEach((row) => {
        const imageElement = row.querySelector(".meeting-notes img");
        if (imageElement) {
            imageElement.src = UNCHECKED_ICON_URL;
        }
    });

    alert("All checkbox states have been cleared.");
}

function clearAllTicketSleep() {
    const confirmed = window.confirm("This will unhide every sleeping ticket. Continue?");
    if (!confirmed) {
        return;
    }

    const ticketKeys = getAllTicketStateKeys();
    ticketKeys.forEach((key) => updateTicketState(key, { hideUntil: null }));

    const rows = document.querySelectorAll("#resultsTable tbody tr");
    rows.forEach((row) => {
        if (row) {
            row.style.display = "";
        }
    });

    alert("All sleeping tickets have been restored.");
}
