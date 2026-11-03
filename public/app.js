const form = document.querySelector('#enrolment-form');
const feedback = document.querySelector('#feedback');
const listStatus = document.querySelector('#list-status');
const enrolments = document.querySelector('#enrolments');
const submitButton = form.querySelector('button');

async function loadEnrolments() {
  try {
    const response = await fetch('/api/enrolments');
    if (!response.ok) throw new Error('Unable to load enrolments.');
    const records = await response.json();
    enrolments.replaceChildren();
    for (const record of records) {
      const row = document.createElement('tr');
      const employee = document.createElement('td');
      employee.textContent = record.employeeName;
      const identity = document.createElement('small');
      identity.textContent = `${record.employeeId} / ${record.workEmail}`;
      employee.append(identity);
      row.append(employee);
      for (const field of ['courseCode', 'completionStatus']) {
        const cell = document.createElement('td');
        cell.textContent = record[field];
        row.append(cell);
      }
      enrolments.append(row);
    }
    listStatus.textContent = `${records.length} enrolments`;
  } catch (error) {
    listStatus.textContent = error.message;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  feedback.textContent = 'Saving enrolment...';
  try {
    const response = await fetch('/api/enrolments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.join(' ') ?? result.error ?? 'Unable to save enrolment.');
    form.reset();
    feedback.textContent = 'Employee registered.';
    await loadEnrolments();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

loadEnrolments();