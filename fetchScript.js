// This Script is for fetching and sorting ticket tasks from PA

let user, password, LancomButtonId, DD4DDId, PrimaryBoard1, PrimaryBoard2, returnHSEIssues, returnCSPIssues, returnPromptIssues

// Clear old fetched tasks first. Leave manual tasks
function removeRowsExceptHeaderAndManualTask() {
    const table = document.getElementById('resultsTable');
    const rows = table.rows;
    let i = 1; // Start at 1 to skip the header row

    while (i < rows.length) {
        const row = rows[i];
        // Check if the row has the class 'manualTask'
        if (row.classList.contains('manualTask')) {
            i++; // Skip this row and move to the next
        } else {
            table.deleteRow(i); // Delete the row (index does not increment since rows shift)
        }
    }
}

// function to retrieve all tickets / jira issues from PA flow
function getAllTasks() {
    // Remove stale tasks
    removeRowsExceptHeaderAndManualTask()
    // Add spinner
    document.getElementById('spinnerDiv').style.display = 'block'

    // Fetch live tickets from PA - https://make.powerautomate.com/environments/2e21e621-fcf3-eae1-a4d1-9e02b3152fc8/flows/6bfb118f-722a-44fa-9c84-1dfddefa790c/details
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({
        "User": user,
        "PW": password
    });
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };
    fetch("https://prod-18.australiasoutheast.logic.azure.com:443/workflows/8ede7348e08746df81513d8b45912c0a/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=9ThA8L_C0klVuBaYpZ_kXvhoHHYLmBVlHnRgFWIxvJo", requestOptions)
        .then((response) => response.json())
        .then((result) => { 
            // error handling for wrong password provided to PA
            if(result.status==="wrong password"){
                console.error(result.status);                
                // remove spinner
                document.getElementById('spinnerDiv').style.display = 'none'
                // reopen auth modal
                document.getElementById('authentication-modal').style.display = 'flex'
                document.getElementById('passwordEnteredDiv').style.display = 'none'
                document.getElementById('passwordLabel').innerText = 'Wrong password, try again'
                document.getElementById('passwordLabel').style.color = 'red'
                return
            }

            // IF PA is happy with auth, assign member preferences from PA flow response:
            LancomButtonId = result.memberDetails.LancomButtonId
            DD4DDId = result.memberDetails.DD4DDId
            PrimaryBoard1 = result.memberBoards[0]
            PrimaryBoard2 = result.memberBoards[1]
            returnHSEIssues  = result.memberJiraBoardPreferences.returnHSEIssues
            returnCSPIssues  = result.memberJiraBoardPreferences.returnCSPIssues
            returnPromptIssues  = result.memberJiraBoardPreferences.returnPromptIssues

            // update Dom with board preferences:
            document.getElementById('hideTicketsNotFromBoardButton1').innerHTML = `<b>${PrimaryBoard1.ShortBoardName}</b>`
            document.getElementById('hideTicketsNotFromBoardButton2').innerHTML = `<b>${PrimaryBoard2.ShortBoardName}</b>`
            document.getElementById('spinnerDiv').style.display = 'none'

            // Refactor jira issues payload
            const jiraResults = result.jiraResults.map((issue) => {
                const LancomJiraURL = `https://lancom.atlassian.net/browse/${issue.key}`

                return {
                    name:issue.key,
                    ticketName: `<a href="${LancomJiraURL}" class="text-blue-600 hover:underline">${issue.key}</a>`,
                    techPortalLink: "",
                    contactName: issue.fields.assignee !== null ? issue.fields.assignee.displayName : "",
                    boardName: issue.key.startsWith("PBR") ? "Prompt" : issue.key.startsWith("CSP") ? "CSP Portal" : "HSE Connect",
                    priorityName: issue.fields.priority !== null ? issue.fields.priority.id : "",
                    assignedMembers: null,
                    LancomJiraURL: LancomJiraURL,
                    status: issue.fields.status.name,
                };
            })

            // Refactor tickets payload to include jira links
            const sortedTickets = result.ticketResults.map((ticket) => {
                let CIJiraLink = ticket.tags.find((tag) => tag.startsWith("cis")) || "N/A";
                CIJiraLink = CIJiraLink.toUpperCase();
                let CIPacTicket = ticket.tags.find((tag) => tag.startsWith("pac")) || "N/A";
                CIPacTicket = CIPacTicket.toUpperCase();
                let LancomCSPJiraLink = ticket.tags.find((tag) => {
                    if (tag.startsWith("cspp")) { return true }
                    else if (tag.startsWith("pbr")) { return true }
                    else if (tag.startsWith("hse")) { return true }
                    else return false
                })

                LancomCSPJiraLink !== undefined ? LancomCSPJiraLink = LancomCSPJiraLink.toUpperCase() : LancomCSPJiraLink = "N/A";
                return {
                    name:ticket.name.substring(0, 65),
                    ticketName: `<a href="https://cloud.lancom.tech/portal/v2/groups/my-tickets/tickets/${ticket.id}" class="text-blue-600 hover:underline">${ticket.name.substring(0, 65)}</a>`,
                    techPortalLink: ticket.board.name === "DeskDirector Support" ?
                        `<a href="https://support.deskdirector.com/tech/tickets/${ticket.id}" class="text-blue-600 hover:underline">${ticket.id}</a>`
                        :
                        `<a href="https://cloud.lancom.tech/tech/tickets/${ticket.id}" class="text-blue-600 hover:underline">${ticket.id}</a>`
                    ,
                    contactName: ticket.contact !== null ? ticket.contact.name : "",
                    boardName: ticket.board.name ==="Prompt Service Board" ? ticket.board.name.substring(0, 6):ticket.board.name==="HSE Connect Service Board"?ticket.board.name.substring(0, 11):ticket.board.name,
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
                };
            })

            // Generate the HTML table rows from tickets payload
            sortedTickets.forEach((ticket, index) => {

                // Filter out tickets that are not relevant to me
                if (ticket.boardName === PrimaryBoard1.BoardName ||
                    ticket.boardName === PrimaryBoard2.BoardName ||
                    ticket.assignedMembers != [] && ticket.assignedMembers.find(member => member.id === LancomButtonId) ||
                    ticket.assignedMembers != [] && ticket.assignedMembers.find(member => member.id === DD4DDId)
                ) {

                    let tableRow = `
                    <tr id="row-${index}" class="ticketRow" draggable="true" ondragstart="drag(event)" ondragover="allowDrop(event)" ondrop="drop(event)">
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
                                <div onclick="tickBox('tickBoxDiv${index + 1}')">
                                    <img id="tickBoxDiv${index + 1}" width="30" height="30" src="${localStorage.getItem(ticket.name+": Check Box Url")?localStorage.getItem(ticket.name+": Check Box Url"):"https://img.icons8.com/ios/30/checked-2--v3.png"}" alt="checked-2--v3" />
                                </div>
                                <input id="${index}-notesField" type="text" class="w-full p-1 border rounded" placeholder="..." value="${localStorage.getItem(ticket.name+": Notes Field")?localStorage.getItem(ticket.name+": Notes Field"):""}" />
                            </div>
                        </td>

                        <td class="py-1 px-2 text-center border border-gray-200 action-buttons">
                            <button onclick="deleteRow(${index})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Remove</button>
                            <button onclick="hideRow(${index})" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">Hide</button>
                        </td>

                    </tr>
                `
                    const tableBody = document.getElementById("tableBody"); // Locate the <tbody>

                    // Append the row to the table body
                    tableBody.insertAdjacentHTML("beforeend", tableRow);

                }
            })

            // Generate the HTML table rows from jira payload
            jiraResults.forEach((issue, index) => {
                if( issue.boardName==="Prompt" && returnPromptIssues ||
                    issue.boardName==="CSP Portal" && returnCSPIssues ||
                    issue.boardName==="HSE Connect" && returnHSEIssues
                ){

                    let tableRow = `
                    <tr id="row-${index + 1000}" class="jiraRow" draggable="true" ondragstart="drag(event)" ondragover="allowDrop(event)" ondrop="drop(event)">
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
                                <div onclick="tickBox('tickBoxDiv${index + 1000}')">
                                    <img id="tickBoxDiv${index + 1000}" width="30" height="30" src="${localStorage.getItem("Jira Issue: " + issue.name+": Check Box Url")?localStorage.getItem("Jira Issue: " + issue.name+": Check Box Url"):"https://img.icons8.com/ios/30/checked-2--v3.png"}" alt="checked-2--v3" />
                                </div>
                                <input id="${index + 1000}-notesField" type="text" class="w-full p-1 border rounded" placeholder="..." value="${localStorage.getItem("Jira Issue: " + issue.name+": Notes Field")?localStorage.getItem("Jira Issue: " + issue.name+": Notes Field"):""}" />
                            </div>
                        </td>

                        <td class="py-1 px-2 text-center border border-gray-200 action-buttons">
                            <button onclick="deleteRow(${index + 1000})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Remove</button>
                            <button onclick="hideRow(${index + 1000})" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">Hide</button>
                        </td>
                        
                    </tr>
                `
                const tableBody = document.getElementById("tableBody"); // Locate the <tbody>

                // remove spinner
                document.getElementById('spinnerDiv').style.display = 'none'

                // Append the row to the table body
                tableBody.insertAdjacentHTML("beforeend", tableRow);

                }
            })


            // Add event listener to save user interaction to local storage
            // Select the table
            const fullTable = document.getElementById('resultsTable');
            // Loop through all rows in the table body (ignoring the header)
            const rows = fullTable.querySelectorAll('tbody tr');

            rows.forEach(row => {

                // notes input field
                const notesField = row.cells[8]
                const inputField = notesField.querySelector('input') // Select the input field

                // TicketName field
                const TicketName = row.cells[0]
                const TicketNameText = TicketName.innerText

                // Checked / Unchecked image
                const imageElement = row.querySelector('.meeting-notes img');

                // Check if the image exists
                if (imageElement){

                    imageElement.addEventListener('click', function(event) {
                        const imageUrl = event.target.src; // Get the src of the clicked image
                        localStorage.setItem(TicketNameText+": Check Box Url", imageUrl==="https://img.icons8.com/color/30/checked-checkbox.png"?"https://img.icons8.com/ios/30/checked-2--v3.png":"https://img.icons8.com/color/30/checked-checkbox.png")

                    });

                }

                if (inputField) {
                    inputField.addEventListener('input', function() {

                        localStorage.setItem(TicketNameText+": Notes Field",inputField.value)

                    });
                }

            });

        })
        .catch((error) => {
            console.error(error);                
            // remove spinner
            document.getElementById('spinnerDiv').style.display = 'none'
        });

}

