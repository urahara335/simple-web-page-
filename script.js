(() => {
  const form         = document.getElementById('signal-form');
  const nameInput     = document.getElementById('name');
  const messageInput  = document.getElementById('message');
  const nameError     = document.getElementById('name-error');
  const messageError  = document.getElementById('message-error');
  const submitBtn     = document.getElementById('submit-btn');
  const formStatus    = document.getElementById('form-status');
  const ticketList     = document.getElementById('ticket-list');
  const emptyState    = document.getElementById('empty-state');
  const counterEl      = document.getElementById('ticket-counter');

  const API_URL = 'api.php';

  // ---- render helpers ----
  function ticketNode(entry) {
    const li = document.createElement('li');
    li.className = 'ticket';
    li.innerHTML = `
      <div class="ticket-top">
        <span class="ticket-name"></span>
        <span class="ticket-time"></span>
      </div>
      <p class="ticket-message"></p>
    `;
    li.querySelector('.ticket-name').textContent = entry.name;
    li.querySelector('.ticket-time').textContent = entry.time;
    li.querySelector('.ticket-message').textContent = entry.message;
    return li;
  }

  function setCounter(n) {
    counterEl.textContent = n;
  }

  function renderList(entries) {
    ticketList.innerHTML = '';
    if (!entries.length) {
      ticketList.appendChild(emptyState);
      setCounter(0);
      return;
    }
    entries.forEach(entry => ticketList.appendChild(ticketNode(entry)));
    setCounter(entries.length);
  }

  function prependTicket(entry, count) {
    if (ticketList.contains(emptyState)) {
      ticketList.removeChild(emptyState);
    }
    ticketList.insertBefore(ticketNode(entry), ticketList.firstChild);
    setCounter(count);
  }

  // ---- load existing entries on page load ----
  async function loadEntries() {
    try {
      const res = await fetch(API_URL, { method: 'GET' });
      const data = await res.json();
      if (data.ok) {
        renderList(data.entries);
      }
    } catch (err) {
      // Board simply stays empty if the API can't be reached (e.g. no PHP server running)
      console.warn('Could not load signals:', err);
    }
  }

  // ---- client-side validation ----
  function validate() {
    let valid = true;

    nameError.textContent = '';
    messageError.textContent = '';
    nameInput.closest('.field').classList.remove('has-error');
    messageInput.closest('.field').classList.remove('has-error');

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!name) {
      nameError.textContent = 'Name is required.';
      nameInput.closest('.field').classList.add('has-error');
      valid = false;
    } else if (name.length > 60) {
      nameError.textContent = 'Keep it under 60 characters.';
      nameInput.closest('.field').classList.add('has-error');
      valid = false;
    }

    if (!message) {
      messageError.textContent = 'Say something first.';
      messageInput.closest('.field').classList.add('has-error');
      valid = false;
    } else if (message.length > 400) {
      messageError.textContent = 'Keep it under 400 characters.';
      messageInput.closest('.field').classList.add('has-error');
      valid = false;
    }

    return valid;
  }

  // ---- submit handler ----
  async function handleSubmit(e) {
    e.preventDefault();
    formStatus.textContent = '';
    formStatus.className = 'form-status';

    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    const payload = {
      name: nameInput.value.trim(),
      message: messageInput.value.trim(),
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.errors) {
          if (data.errors.name) {
            nameError.textContent = data.errors.name;
            nameInput.closest('.field').classList.add('has-error');
          }
          if (data.errors.message) {
            messageError.textContent = data.errors.message;
            messageInput.closest('.field').classList.add('has-error');
          }
        }
        formStatus.textContent = 'Please fix the highlighted fields.';
        formStatus.classList.add('failure');
        return;
      }

      prependTicket(data.entry, data.count);
      form.reset();
      formStatus.textContent = 'Signal sent.';
      formStatus.classList.add('success');
    } catch (err) {
      formStatus.textContent = 'Could not reach the server. Is PHP running?';
      formStatus.classList.add('failure');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  }

  form.addEventListener('submit', handleSubmit);
  document.addEventListener('DOMContentLoaded', loadEntries);
  loadEntries();
})();
