// This Script is for fetching and sorting ticket tasks from PA

let user, password, LancomButtonId, DD4DDId, PrimaryBoard1, PrimaryBoard2, returnHSEIssues, returnCSPIssues, returnPromptIssues;

function attachRowInteractionHandlers(row) {
    if (!row || row.dataset.interactionBound === "true") {
        return;
    }

    const ticketId = row.dataset.ticketId;
    if (!ticketId) {
        return;
    }

    const notesContainer = row.querySelector(".meeting-notes");
    const notesInput = notesContainer ? notesContainer.querySelector("input") : null;
    const imageElement = notesContainer ? notesContainer.querySelector("img") : null;

    if (imageElement) {
        imageElement.style.cursor = "pointer";
        imageElement.addEventListener("click", function () {
            const currentState = getTicketState(ticketId);
            const nextChecked = !currentState.isChecked;
            const updatedState = updateTicketState(ticketId, {
                isChecked: nextChecked,
                checkedDate: nextChecked ? new Date().toISOString() : null,
            });
            imageElement.src = updatedState.isChecked ? CHECKED_ICON_URL : UNCHECKED_ICON_URL;
        });
    }

    if (notesInput) {
        notesInput.addEventListener("input", function () {
            updateTicketState(ticketId, { notes: notesInput.value || "" });
        });
    }

    row.dataset.interactionBound = "true";
}

// Clear old fetched tasks first. Leave manual tasks
function removeRowsExceptHeaderAndManualTask() {
    const table = document.getElementById("resultsTable");
    const rows = table.rows;
    let i = 1; // Start at 1 to skip the header row

    while (i < rows.length) {
        const row = rows[i];
        // Check if the row has the class 'manualTask'
        if (row.classList.contains("manualTask")) {
            i++; // Skip this row and move to the next
        } else {
            table.deleteRow(i); // Delete the row (index does not increment since rows shift)
        }
    }
}

// function to retrieve all tickets / jira issues from PA flow
function getAllTasks() {
    // Remove stale tasks
    removeRowsExceptHeaderAndManualTask();
    // Add spinner
    document.getElementById("spinnerDiv").style.display = "block";

    // Fetch live tickets from PA - https://make.powerautomate.com/environments/2e21e621-fcf3-eae1-a4d1-9e02b3152fc8/flows/6bfb118f-722a-44fa-9c84-1dfddefa790c/details
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({
        User: user,
        PW: password,
    });
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
    };
    fetch(
        "https://2e21e621fcf3eae1a4d19e02b3152f.c8.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8ede7348e08746df81513d8b45912c0a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xwP8DXZEU8SsGOtGSxss6jGPScAfmngT_4-bnOr4gk4",
        requestOptions
    )
        .then((response) => response.json())
        .then((result) => {
            // error handling for wrong password provided to PA
            if (result.status === "wrong password") {
                console.error(result.status);
                // remove spinner
                document.getElementById("spinnerDiv").style.display = "none";
                // reopen auth modal
                document.getElementById("authentication-modal").style.display = "flex";
                document.getElementById("passwordEnteredDiv").style.display = "none";
                document.getElementById("passwordLabel").innerText = "Wrong password, try again";
                document.getElementById("passwordLabel").style.color = "red";
                return;
            }

            // IF PA is happy with auth, assign member preferences from PA flow response:
            LancomButtonId = result.memberDetails.LancomButtonId;
            DD4DDId = result.memberDetails.DD4DDId;
            PrimaryBoard1 = result.memberBoards[0];
            PrimaryBoard2 = result.memberBoards[1];
            returnHSEIssues = result.memberJiraBoardPreferences.returnHSEIssues;
            returnCSPIssues = result.memberJiraBoardPreferences.returnCSPIssues;
            returnPromptIssues = result.memberJiraBoardPreferences.returnPromptIssues;

            // update Dom with board preferences:
            if(PrimaryBoard1){
                document.getElementById("hideTicketsNotFromBoardButton1").innerHTML = `<b>${PrimaryBoard1.ShortBoardName}</b>`;
                document.getElementById("showActionableBoardButton1").innerHTML = `<b>${PrimaryBoard1.ShortBoardName}</b>`;
            }
            if(PrimaryBoard2){
                document.getElementById("hideTicketsNotFromBoardButton2").innerHTML = `<b>${PrimaryBoard2.ShortBoardName}</b>`;
                document.getElementById("showActionableBoardButton2").innerHTML = `<b>${PrimaryBoard2.ShortBoardName}</b>`;
            }
            
            document.getElementById("spinnerDiv").style.display = "none";

            // Remove board preference buttons if no board selected
            if (!PrimaryBoard1 || PrimaryBoard1.BoardName === "None") {
                document.getElementById("hideTicketsNotFromBoardButton1").style.display = "none";
                document.getElementById("showActionableBoardButton1").style.display = "none";
            }
            if (!PrimaryBoard2 || PrimaryBoard2.BoardName === "None") {
                document.getElementById("hideTicketsNotFromBoardButton2").style.display = "none";
                document.getElementById("showActionableBoardButton2").style.display = "none";
            }

            // Refactor jira issues payload
            const jiraResults = result.jiraResults.map((issue) => {
                const LancomJiraURL = `https://lancom.atlassian.net/browse/${issue.key}`;

                return {
                    name: issue.key,
                    ticketName: `<a href="${LancomJiraURL}" class="text-blue-600 hover:underline">${issue.key}</a>`,
                    techPortalLink: "",
                    contactName: issue.fields.assignee !== null ? issue.fields.assignee.displayName : "",
                    boardName: issue.key.startsWith("PBR") ? "Prompt" : issue.key.startsWith("CSP") ? "CSP Portal" : "HSE Connect",
                    priorityName: issue.fields.priority !== null ? issue.fields.priority.id : "",
                    assignedMembers: null,
                    LancomJiraURL: LancomJiraURL,
                    status: issue.fields.status.name,
                };
            });

            // Refactor tickets payload to include jira links
            const sortedTickets = result.ticketResults.map((ticket) => {
                let CIJiraLink = ticket.tags.find((tag) => tag.startsWith("cis")) || "N/A";
                CIJiraLink = CIJiraLink.toUpperCase();
                let CIPacTicket = ticket.tags.find((tag) => tag.startsWith("pac")) || "N/A";
                CIPacTicket = CIPacTicket.toUpperCase();
                let LancomCSPJiraLink = ticket.tags.find((tag) => {
                    if (tag.startsWith("cspp")) {
                        return true;
                    } else if (tag.startsWith("pbr")) {
                        return true;
                    } else if (tag.startsWith("hse")) {
                        return true;
                    } else return false;
                });

                LancomCSPJiraLink !== undefined ? (LancomCSPJiraLink = LancomCSPJiraLink.toUpperCase()) : (LancomCSPJiraLink = "N/A");
                return {
                    name: ticket.name.substring(0, 65),
                    ticketName: `<a href="https://cloud.lancom.tech/portal/v2/groups/my-tickets/tickets/${
                        ticket.id
                    }" class="text-blue-600 hover:underline">${ticket.name.substring(0, 65)}</a>`,
                    techPortalLink:
                        ticket.board.name === "DeskDirector Support"
                            ? `<a href="https://support.deskdirector.com/tech/tickets/${ticket.id}" class="text-blue-600 hover:underline">${ticket.id}</a>`
                            : `<a href="https://cloud.lancom.tech/tech/tickets/${ticket.id}" class="text-blue-600 hover:underline">${ticket.id}</a>`,
                    contactName: ticket.contact !== null ? ticket.contact.name : "",
                    boardName:
                        ticket.board.name === "Prompt Service Board"
                            ? ticket.board.name.substring(0, 6)
                            : ticket.board.name === "HSE Connect Service Board"
                            ? ticket.board.name.substring(0, 11)
                            : ticket.board.name,
                    priorityName: ticket.priority.name.substring(9, 10),
                    assignedMembers: ticket.assignedMembers,
                    CIJiraLink:
                        CIJiraLink !== "N/A"
                            ? `<a href="https://cloudinsurance.atlassian.net/servicedesk/customer/portal/1/${CIJiraLink}" class="text-blue-600 hover:underline">${CIJiraLink}</a>`
                            : null,
                    LancomCSPJiraLink:
                        LancomCSPJiraLink !== "N/A"
                            ? `<a href="https://lancom.atlassian.net/browse/${LancomCSPJiraLink}" class="text-blue-600 hover:underline">${LancomCSPJiraLink}</a>`
                            : null,
                    pacTicketURL:
                        CIPacTicket !== "N/A"
                            ? `<a href="https://cloudinsurance.atlassian.net/browse/${CIPacTicket}" class="text-blue-600 hover:underline">${CIPacTicket}</a>`
                            : null,
                    status: ticket.status.name,
                    ticketId: ticket.id,
                };
            });

            // Generate the HTML table rows from tickets payload
            sortedTickets.forEach((ticket, index) => {
                // Filter out tickets that are not relevant to me
                if (
                    ticket.boardName === PrimaryBoard1?.BoardName ||
                    ticket.boardName === PrimaryBoard2?.BoardName ||
                    (ticket.assignedMembers != [] && ticket.assignedMembers.find((member) => member.id === LancomButtonId)) ||
                    (ticket.assignedMembers != [] && ticket.assignedMembers.find((member) => member.id === DD4DDId))
                ) {
                    const ticketId = String(ticket.ticketId);
                    const ticketState = getTicketState(ticketId);
                    const isHidden = shouldHideTicket(ticketId, ticketState);
                    let styleText = "";

                    if (isHidden) {
                        styleText = "none";
                    }

                    const checkboxSrc = ticketState.isChecked ? CHECKED_ICON_URL : UNCHECKED_ICON_URL;
                    const notesValue = ticketState.notes || "";

                    let tableRow = `
                    <tr id="row-${index}" data-ticket-id="${ticketId}" style="display:${styleText}" class="ticketRow" draggable="true" ondragstart="drag(event)" ondragover="allowDrop(event)" ondrop="drop(event)">
                        <td class="py-1 px-2 border border-gray-200">${ticket.ticketName}</td>
                        <td style="max-width: 180px;" class="py-1 px-2 border border-gray-200">${ticket.contactName}</td>
                        <td class="py-1 px-2 text-center border border-gray-200">${ticket.techPortalLink}</td>
                        <td class="py-1 px-2 text-center border border-gray-200">${ticket.CIJiraLink || ticket.LancomCSPJiraLink || ""}</td>
                        <td class="py-1 px-2 text-center border border-gray-200">${ticket.pacTicketURL || ""}</td>
                        <td class="py-1 px-2 text-center border border-gray-200">${ticket.boardName || ""}</td>
                        <td class="py-1 px-1 text-center border border-gray-200">${ticket.status}</td>
                        <td style="width: 50px;" class="py-1 px-1 text-center border border-gray-200">${ticket.priorityName}</td>
                        
                        <td class="py-1 px-2 text-center meeting-notes border border-gray-200 span">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div>
                                    <img id="tickBoxDiv${index + 1}" width="30" height="30" src="${checkboxSrc}" alt="checked-2--v3" />
                                </div>
                                <input id="${index}-notesField" type="text" class="w-full p-1 border rounded" placeholder="..." value="${notesValue}" />
                            </div>
                        </td>

                        <td class="text-center border border-gray-200 action-buttons">
                            <button onclick="hideForADay(${index})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Sleep</button>
                        </td>

                    </tr>
                `;

                    // Append the row to the table body
                    const tableBody = document.getElementById("tableBody"); // Locate the <tbody>
                    tableBody.insertAdjacentHTML("beforeend", tableRow);
                }
            });

            // Generate the HTML table rows from jira payload
            jiraResults.forEach((issue, index) => {
                if (
                    (issue.boardName === "Prompt" && returnPromptIssues) ||
                    (issue.boardName === "CSP Portal" && returnCSPIssues) ||
                    (issue.boardName === "HSE Connect" && returnHSEIssues)
                ) {
                    const ticketId = issue.name;
                    const issueState = getTicketState(ticketId);
                    const isHidden = shouldHideTicket(ticketId, issueState);
                    let styleText = "";

                    if (isHidden) {
                        console.log("Hiding this one until the date is reached: " + ticketId);
                        styleText = "none";
                    }

                    const checkboxSrc = issueState.isChecked ? CHECKED_ICON_URL : UNCHECKED_ICON_URL;
                    const notesValue = issueState.notes || "";

                    let tableRow = `
                    <tr id="row-${
                        index + 1000
                    }" data-ticket-id="${ticketId}" style="display:${styleText}"  class="jiraRow" draggable="true" ondragstart="drag(event)" ondragover="allowDrop(event)" ondrop="drop(event)">
                        <td class="py-1 px-2 border border-gray-200"> Jira Issue: ${issue.ticketName}</td>
                        <td style="max-width: 180px;" class="py-1 px-2 border border-gray-200">${issue.contactName}</td>
                        <td class="py-1 px-2 text-center border border-gray-200">${issue.techPortalLink}</td>
                        <td class="py-1 px-2 text-center border border-gray-200">${issue.ticketName}</td>
                        <td class="py-1 px-2 text-center border border-gray-200"></td>
                        <td class="py-1 px-2 text-center border border-gray-200">${issue.boardName || ""}</td>
                        <td class="py-1 px-1 text-center border border-gray-200">${issue.status}</td>
                        <td style="width: 50px;" class="py-1 px-1 text-center border border-gray-200">${issue.priorityName}</td>
                        
                        <td class="py-1 px-2 text-center meeting-notes border border-gray-200 span">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div>
                                    <img id="tickBoxDiv${index + 1000}" width="30" height="30" src="${checkboxSrc}" alt="checked-2--v3" />
                                </div>
                                <input id="${
                                    index + 1000
                                }-notesField" type="text" class="w-full p-1 border rounded" placeholder="..." value="${notesValue}" />
                            </div>
                        </td>

                        <td class="py-1 px-2 text-center border border-gray-200 action-buttons">
                            <button onclick="hideForADay(${
                                index + 1000
                            })" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Sleep 24hrs</button>
                            <button onclick="hideRow(${
                                index + 1000
                            })" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">Hide</button>
                        </td>
                        
                    </tr>
                `;
                    const tableBody = document.getElementById("tableBody"); // Locate the <tbody>

                    // remove spinner
                    document.getElementById("spinnerDiv").style.display = "none";

                    // insert into html table
                    tableBody.insertAdjacentHTML("beforeend", tableRow);
                }
            });

            // Add event listener to save user interaction to local storage
            // Select the table
            const fullTable = document.getElementById("resultsTable");
            // Loop through all rows in the table body (ignoring the header)
            const rows = fullTable.querySelectorAll("tbody tr");

            rows.forEach((row) => {
                const ticketId = row.dataset.ticketId;
                if (!ticketId) {
                    return;
                }

                // notes input field
                const notesField = row.cells[8];
                const inputField = notesField?.querySelector("input"); // Select the input field

                // Checked / Unchecked image
                const imageElement = row.querySelector(".meeting-notes img");

                if (imageElement) {
                    imageElement.style.cursor = "pointer";
                    imageElement.addEventListener("click", function () {
                        const currentState = getTicketState(ticketId);
                        const nextChecked = !currentState.isChecked;
                        const updatedState = updateTicketState(ticketId, {
                            isChecked: nextChecked,
                            checkedDate: nextChecked ? new Date().toISOString() : null,
                        });
                        imageElement.src = updatedState.isChecked ? CHECKED_ICON_URL : UNCHECKED_ICON_URL;
                    });
                }

                if (inputField) {
                    inputField.addEventListener("input", function () {
                        updateTicketState(ticketId, { notes: inputField.value || "" });
                    });
                }
            });
        });
}
