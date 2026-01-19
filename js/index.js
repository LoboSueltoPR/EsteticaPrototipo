const sheetConfig = {
  SHEET_ID: "PEGA_ACA_TU_SHEET_ID",
  API_KEY: "PEGA_ACA_TU_API_KEY",
  RANGE_TURNOS: "Turnos!A:H",
  RANGE_BLOQUEOS: "Bloqueos!A:B"
};

const services = [
  {
    id: "depilacion",
    name: "Depilación facial",
    duration: 30,
    price: "$12.000"
  },
  {
    id: "limpieza",
    name: "Limpieza profunda",
    duration: 60,
    price: "$18.500"
  },
  {
    id: "masajes",
    name: "Masajes relajantes",
    duration: 45,
    price: "$15.000"
  }
];

const existingBookings = [
  { date: "2024-07-12", time: "10:00" },
  { date: "2024-07-12", time: "11:30" },
  { date: "2024-07-13", time: "14:00" }
];

const vacationBlocks = [
  { date: "2024-07-15", reason: "Vacaciones" },
  { date: "2024-07-16", reason: "Capacitación" }
];

const weeklyClosedDays = [0];

const wizard = document.getElementById("wizard");
const panels = document.querySelectorAll(".panel");
const stepperItems = document.querySelectorAll(".stepper__item");
const serviceOptions = document.getElementById("serviceOptions");
const dateInput = document.getElementById("dateInput");
const timeSlots = document.getElementById("timeSlots");
const slotsHelper = document.getElementById("slotsHelper");
const dateHelper = document.getElementById("dateHelper");
const summary = document.getElementById("summary");
const successMessage = document.getElementById("successMessage");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const ctaStart = document.getElementById("ctaStart");
const ctaInfo = document.getElementById("ctaInfo");
const sheetInfo = document.getElementById("sheetInfo");

const formFields = {
  name: document.getElementById("nameInput"),
  email: document.getElementById("emailInput"),
  phone: document.getElementById("phoneInput"),
  notes: document.getElementById("notesInput")
};

const state = {
  step: 0,
  service: null,
  date: null,
  time: null,
  client: {
    name: "",
    email: "",
    phone: "",
    notes: ""
  }
};

ctaStart.addEventListener("click", () => {
  wizard.scrollIntoView({ behavior: "smooth" });
});

ctaInfo.addEventListener("click", () => {
  sheetInfo.scrollIntoView({ behavior: "smooth" });
});

function renderServices() {
  serviceOptions.innerHTML = "";
  services.forEach((service) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.innerHTML = `
      <h3>${service.name}</h3>
      <p>${service.duration} min · ${service.price}</p>
    `;
    card.addEventListener("click", () => {
      state.service = service;
      updateServiceSelection();
      validateStep();
    });
    serviceOptions.appendChild(card);
  });
}

function updateServiceSelection() {
  const cards = serviceOptions.querySelectorAll(".card");
  cards.forEach((card, index) => {
    const service = services[index];
    card.classList.toggle("active", state.service?.id === service.id);
  });
}

function getSlotsForDate(dateValue) {
  if (!dateValue) {
    return { blocked: true, reason: "Seleccioná una fecha para ver los horarios." };
  }

  const selectedDate = new Date(`${dateValue}T00:00:00`);
  const day = selectedDate.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return { blocked: true, reason: "No se pueden reservar fechas pasadas." };
  }

  if (weeklyClosedDays.includes(day)) {
    return { blocked: true, reason: "Ese día no atendemos." };
  }

  const vacation = vacationBlocks.find((block) => block.date === dateValue);
  if (vacation) {
    return { blocked: true, reason: `Día bloqueado: ${vacation.reason}.` };
  }

  const slots = [];
  for (let hour = 9; hour < 18; hour += 1) {
    [0, 30].forEach((minutes) => {
      const label = `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      slots.push(label);
    });
  }

  const booked = existingBookings
    .filter((booking) => booking.date === dateValue)
    .map((booking) => booking.time);

  const available = slots.filter((slot) => !booked.includes(slot));

  if (!available.length) {
    return { blocked: true, reason: "Ese día está completo. Probá otra fecha." };
  }

  return { blocked: false, slots: available };
}

function renderSlots(dateValue) {
  timeSlots.innerHTML = "";
  slotsHelper.textContent = "";
  dateHelper.textContent = "";

  const result = getSlotsForDate(dateValue);
  if (result.blocked) {
    slotsHelper.textContent = result.reason;
    return;
  }

  result.slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot";
    button.textContent = slot;
    button.addEventListener("click", () => {
      state.time = slot;
      updateSlotSelection();
      validateStep();
    });
    timeSlots.appendChild(button);
  });

  updateSlotSelection();
}

function updateSlotSelection() {
  const buttons = timeSlots.querySelectorAll(".slot");
  buttons.forEach((button) => {
    button.classList.toggle("active", button.textContent === state.time);
  });
}

function updateSummary() {
  summary.innerHTML = `
    <div><strong>Servicio:</strong> ${state.service?.name ?? "-"}</div>
    <div><strong>Fecha:</strong> ${state.date ?? "-"}</div>
    <div><strong>Hora:</strong> ${state.time ?? "-"}</div>
    <div><strong>Nombre:</strong> ${state.client.name || "-"}</div>
    <div><strong>Email:</strong> ${state.client.email || "-"}</div>
    <div><strong>WhatsApp:</strong> ${state.client.phone || "-"}</div>
    <div><strong>Notas:</strong> ${state.client.notes || "-"}</div>
  `;
}

function goToStep(step) {
  state.step = step;
  panels.forEach((panel) => {
    const panelStep = Number(panel.dataset.panel);
    panel.classList.toggle("active", panelStep === state.step);
  });
  stepperItems.forEach((item) => {
    const stepIndex = Number(item.dataset.step);
    item.classList.toggle("active", stepIndex === state.step);
  });

  prevBtn.disabled = state.step === 0;
  nextBtn.textContent = state.step === panels.length - 1 ? "Confirmar" : "Continuar";
  validateStep();
}

function validateStep() {
  if (state.step === 0) {
    nextBtn.disabled = !state.service;
    return;
  }

  if (state.step === 1) {
    nextBtn.disabled = !(state.date && state.time);
    return;
  }

  if (state.step === 2) {
    const { name, email, phone } = state.client;
    nextBtn.disabled = !(name && email && phone);
    return;
  }

  nextBtn.disabled = false;
}

function handleNext() {
  if (state.step === panels.length - 1) {
    successMessage.classList.add("visible");
    return;
  }

  if (state.step === 2) {
    updateSummary();
  }

  goToStep(Math.min(state.step + 1, panels.length - 1));
}

function handlePrev() {
  if (state.step === 0) return;
  goToStep(state.step - 1);
}

prevBtn.addEventListener("click", handlePrev);
nextBtn.addEventListener("click", handleNext);

serviceOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const index = Array.from(serviceOptions.children).indexOf(button);
  if (index === -1) return;
  state.service = services[index];
  updateServiceSelection();
  validateStep();
});

dateInput.addEventListener("change", (event) => {
  const value = event.target.value;
  state.date = value;
  state.time = null;
  renderSlots(value);
  validateStep();
});

Object.values(formFields).forEach((field) => {
  field.addEventListener("input", () => {
    state.client = {
      name: formFields.name.value.trim(),
      email: formFields.email.value.trim(),
      phone: formFields.phone.value.trim(),
      notes: formFields.notes.value.trim()
    };
    validateStep();
  });
});

renderServices();
goToStep(0);
renderSlots(dateInput.value);
