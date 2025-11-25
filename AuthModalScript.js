// Script for authentication modal -->

    // JavaScript to handle form submission
    const form = document.getElementById('authModal');
    const nameButtons = document.querySelectorAll('.name-button');
    const selectedNameInput = document.getElementById('selectedName');

    // Handle button clicks to select a name
    nameButtons.forEach(button => {
      button.addEventListener('click', () => {
        const selectedName = button.getAttribute('data-name');
        selectedNameInput.value = selectedName; // Set the hidden input value
      });
    });

    // Handle form submission
    form.addEventListener('submit', (event) => {
      event.preventDefault(); // Prevent the default form submission
      
      // Get form values
      const passwordInputValue = document.getElementById('password').value;
      const selectedName = selectedNameInput.value;

      if (!selectedName) {
        alert('Please select a name before submitting.');
        return;
      }

      // Handle the form data
      document.getElementById('authentication-modal').style.display = 'none'
      document.getElementById('passwordEnteredDiv').style.display = 'block'
      document.getElementById('spinnerDiv').style.display = 'block'

      user = selectedName;
      password = passwordInputValue;
      getAllTasks()

    // update Dom with board preferences:
    document.getElementById('titleH2').innerHTML = `<b>${user}'s TicketSanity</b>`



    });
