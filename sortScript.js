// Script for manipulating table / ticket results -->


    // Sort tickets by Priority / board / Status
    let sortAscendingOrder = true;
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

        console.log(`Sorting by column: ${columnName} (Index: ${columnIndex})`);

        // Sort rows by the specified column
        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[columnIndex]?.innerText.trim();    // row.cells[6] will sort by Board name for example
            const cellB = rowB.cells[columnIndex]?.innerText.trim();

            // Handle numeric sorting for the "P" column
            if (columnName === "P") {

                if(sortDirection==="decending"){
                    sortAscendingOrder=true
                }

                const numA = parseFloat(cellA) || 0; // Convert to number or default to 0
                const numB = parseFloat(cellB) || 0;

                // Sort numerically
                return sortAscendingOrder ?
                    numA - numB
                    :
                    numB - numA
                    ;
            }
            
            // Testing this *****************************
            else if (sortOrder){
                const indexA = sortOrder.indexOf(cellA);
                const indexB = sortOrder.indexOf(cellB);
        
                // If a status is not in sortOrder, move it to the end (assign a large index)
                return (indexA === -1 ? sortOrder.length : indexA) - 
                       (indexB === -1 ? sortOrder.length : indexB);
            }


            // Default to text sorting
            return sortAscendingOrder ?
                cellA.localeCompare(cellB)
                :
                cellB.localeCompare(cellA)
                ;

        });

        // Append sorted rows back to tbody
        rows.forEach(row => tbody.appendChild(row));
        sortAscendingOrder = !sortAscendingOrder
    }

    // for the tick option on each ticket row. Changes image to tick / box
    function tickBox(divID) {
        const targetImg = document.getElementById(`${divID}`)
        // Append the image to the div
        if (targetImg.src === "https://img.icons8.com/ios/30/checked-2--v3.png") {
            targetImg.src = 'https://img.icons8.com/color/30/checked-checkbox.png';
        } else {
            targetImg.src = 'https://img.icons8.com/ios/30/checked-2--v3.png';
        }
    }

    // Hide by source (Jirta / Tickets)
    function hideRowsbyDataSource(source) {
        unhideAll()
        const table = document.getElementById("resultsTable");
        const tbody = table.tBodies[0];
        const rows = tbody?.rows || [];

        if (source === "Lancom Button") {
            console.log("hide Lancom Button rows")
            Array.from(rows).forEach(row => {
                if (row.classList.contains('ticketRow')){
                    row.style.display = "none"; // Hide the row
                }
            });
        } else if (source === "Jira") {
            console.log("Hide Jira rows")

            Array.from(rows).forEach(row => {
                if (row.classList.contains('jiraRow')){
                    row.style.display = "none"; // Hide the row
                }
            });
        } 
    }


    // hide by Status
    function hideRowsWithStatus(statusToHide) {

        const table = document.getElementById("resultsTable");
        const tbody = table.tBodies[0];
        const rows = tbody?.rows || [];

        if (statusToHide === "Waiting on Client") {
            console.log("Waiting on Client")
            Array.from(rows).forEach(row => {
                let statusCell = row.cells[6]; // Index of the Status column
                if(statusCell===undefined){statusCell=row.cells[2]}

                if (statusCell &&
                    statusCell.innerText.trim() === "Waiting on client" ||
                    statusCell.innerText.trim() === "Waiting on Client" ||
                    statusCell.innerText.trim() === "No response from client" ||
                    statusCell.innerText.trim() === "No Response from client" ||
                    statusCell.innerText.trim() === "Waiting Client Response"
                ) {
                    row.style.display = "none"; // Hide the row
                }
            });
        }
        else if (statusToHide === "Waiting on 3rd Party") {
            console.log("Waiting on 3rd Party")
            Array.from(rows).forEach(row => {
                let statusCell = row.cells[6]; // Index of the Status column
                if(statusCell===undefined){statusCell=row.cells[2]}

                if (statusCell &&
                    statusCell.innerText.trim() === "Waiting on 3rd Party"
                ) {
                    row.style.display = "none"; // Hide the row
                }
            });
        }
        else if (statusToHide === "Waiting on Dev") {
            console.log("Hide waiting on dev tasks")

            Array.from(rows).forEach(row => {
                let statusCell = row.cells[6]; // Index of the Status column
                if(statusCell===undefined){statusCell=row.cells[2]}
                    if (statusCell &&
                        statusCell.innerText.trim() === "Waiting on Development" ||
                        statusCell.innerText.trim() === "Waiting on Developer" ||
                        statusCell.innerText.trim() === "Waiting on Development - Backlog" ||
                        statusCell.innerText.trim() === "Waiting on Development - In Progress"
                    ) {
                        row.style.display = "none"; // Hide the row
                    }

            });
        } else if (statusToHide === "Waiting on Dev Only") {
            unhideAll()
            console.log("Waiting on Dev only")
            Array.from(rows).forEach(row => {
                const statusCell = row.cells[6]; // Index of the Status column
                if (statusCell &&
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

    function hideTicketsNotFromBoard(boardToShow) {
        unhideAll()

        const table = document.getElementById("resultsTable");
        const tbody = table.tBodies[0];
        const rows = tbody?.rows || [];

        if (boardToShow === PrimaryBoard1.BoardName) {

            Array.from(rows).forEach(row => {
                const boardCell = row.cells[5]; // Index of the Status column
                if (boardCell &&
                    boardCell.innerText.trim().substring(0, 6) !== PrimaryBoard1.BoardName.substring(0, 6)
                ) {
                    row.style.display = "none"; // Hide the row
                }
            });
        } else if (boardToShow === PrimaryBoard2.BoardName) {

            Array.from(rows).forEach(row => {
                const boardCell = row.cells[5]; // Index of the Status column
                if (boardCell &&
                    boardCell.innerText.trim().substring(0, 6) !== PrimaryBoard2.BoardName.substring(0, 6)
                ) {
                    row.style.display = "none"; // Hide the row
                }
            });
        }
    }


    // Drag and drop table rows 
    let draggedRow = null;

    function drag(ev) {
        draggedRow = ev.target;
        ev.target.classList.add('dragging');
    }

    function allowDrop(ev) {
        ev.preventDefault();
    }

    function drop(ev) {
        ev.preventDefault();
        const droppedRow = ev.target.closest('tr');
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
        draggedRow.classList.remove('dragging');
    }

    // Manually add table rows
    function addRow() {
        const tableBody = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
        const newRow = document.createElement('tr');
        newRow.classList.add("manualTask")
        newRow.setAttribute('draggable', 'true');
        newRow.setAttribute('ondragstart', 'drag(event)');
        newRow.setAttribute('ondragover', 'allowDrop(event)');
        newRow.setAttribute('ondrop', 'drop(event)');
        const randomNumber = Math.floor(Math.random() * 900) + 100
        newRow.id = "row-" + randomNumber

        newRow.innerHTML = `
            <td colspan="6" class="p-1 border border-gray-200"><input type="text" placeholder="Task" class="w-full border rounded p-1"></td>
            <td style="width: 50px;" class="p-1 text-center border border-gray-200"><input type="text" placeholder="..." class="border rounded p-1"></td>
            <td style="width: 50px;" class="p-1 text-center border border-gray-200"><input style="width: 35px; "type="text" placeholder="..." class="border rounded p-1"></td>


            <td class="py-1 px-2 text-center meeting-notes border border-gray-200 span">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div onclick="tickBox('tickBoxDiv${randomNumber}')">
                        <img id="tickBoxDiv${randomNumber}" width="30" height="30" src="https://img.icons8.com/ios/30/checked-2--v3.png" alt="checked-2--v3" />
                    </div>
                    <input type="text" class="w-full p-1 border rounded" placeholder="..." />
                </div>
            </td>

            <td class="p-1 text-center border border-gray-200 action-buttons">
                <button onclick="deleteRow(${randomNumber})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>
                <button onclick="this.closest('tr').style.display = 'none'" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">Hide</button>
            </td>
        `;
        tableBody.appendChild(newRow);
    }

    function hideRow(index) {
        document.getElementById('row-' + index).style.display = 'none';
    }

    function deleteRow(index) {

        // Get innerHTML value of row collumn[0] to use as key to remove data from local storage 
        const row = document.getElementById('row-' + index)
        
        // // TicketName field (Old, not used)
        // const TicketName = row.cells[0]
        // const TicketNameText = TicketName.innerText

        // // New identifiers
        const TicketIdentifier = row.cells[2].innerText ? row.cells[2].innerText : row.cells[3].innerText ;

        // Remove data from local storage
        localStorage.removeItem(TicketIdentifier+": Notes Field")
        localStorage.removeItem(TicketIdentifier+": Check Box Url")

        // remove row
        document.getElementById('row-' + index).remove();

    }

    // Hide for a day (TBC)
    function hideForADay(index) {

        // Get innerHTML row from table
        const row = document.getElementById('row-' + index)

        // // New identifiers for localstorage
        const TicketIdentifier = row.cells[2].innerText ? row.cells[2].innerText : row.cells[3].innerText ;

        const date = new Date();
        date.setDate(date.getDate() + 1); // Add 1 day

        // Add timestamp to local storage for this ticket / issue
        localStorage.setItem(TicketIdentifier+": Hide Until", date)

        // hide row
        document.getElementById('row-' + index).style.display = 'none';

    }




    function unhideAll() {

        // remove local storage hide until flags
        let matchingKeys = [];
    
        // Loop through localStorage
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i); // Get key name
    
            if (key.endsWith("Hide Until")) { // Check if key ends with "XYZ"
                matchingKeys.push(key);
            }
        }
    
        matchingKeys.forEach(key=>localStorage.removeItem(key))

        const rows = document.querySelectorAll('tr');
        rows.forEach(row => row.style.display = '');
    }

    function organiseMyList(){

        hideRowsWithStatus('Waiting on Client')
        hideRowsWithStatus('Waiting on Dev')
        hideRowsWithStatus('Waiting on 3rd Party')
        sortTableRows('Status', [ "New", "Client responded", "In Progress", "In Progress - Do Not Send Email","Testing","Ready for QA","Scheduled"])

    }


    function organiseMyLisByPriority(){
        hideRowsWithStatus('Waiting on Client')
        hideRowsWithStatus('Waiting on Dev')
        hideRowsWithStatus('Waiting on 3rd Party')
        sortTableRows('Status', [ "New", "Client responded", "In Progress", "In Progress - Do Not Send Email","Testing","Ready for QA","Scheduled"])
        sortTableRows('P',null, "decending")
    }