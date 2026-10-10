```javascript
"use strict";

// ========================================
// PADCHECK - PS4 / PS5 Controller Tester
// ========================================

const $ = (id) => document.getElementById(id);

let activeIndex = null;
let animationId = null;
let lastPad = null;
let scanMessage = "";
let lastButtonCount = -1;
let lastStatusText = "";

// ---------- Controller detection ----------

function getGamepads() {
  if (!navigator.getGamepads) return [];
  return Array.from(navigator.getGamepads());
}

function findPad() {
  const pads = getGamepads();

  if (activeIndex !== null && pads[activeIndex]) {
    return pads[activeIndex];
  }

  return pads.find(Boolean) || null;
}

function detectModel(id = "") {
  const value = id.toLowerCase();

  if (
    value.includes("dualsense") ||
    value.includes("054c:0ce6") ||
    value.includes("054c:0df2")
  ) {
    return "احتمالاً DualSense / PS5";
  }

  if (
    value.includes("dualshock") ||
    value.includes("054c:05c4") ||
    value.includes("054c:09cc")
  ) {
    return "احتمالاً DualShock 4 / PS4";
  }

  if (value.includes("xbox")) {
    return "دسته Xbox";
  }

  if (!id) {
    return "مدل شناسایی نشد";
  }

  return "دسته بازی؛ مدل دقیق نامشخص";
}

// ---------- Connection ----------

function connectPad(pad) {
  if (!pad) return;

  activeIndex = pad.index;
  lastPad = pad;
  scanMessage = "";

  $("connection").textContent = "دسته متصل است";
  $("connection").classList.add("connected");

  $("connectionInfo").textContent = "متصل";
  $("controllerModel").textContent = detectModel(pad.id);
  $("deviceId").textContent = pad.id || "ارائه نشده";
  $("mappingInfo").textContent = pad.mapping || "استاندارد نیست";

  // Gamepad API provides no hardware serial number.
  $("serialNumber").textContent =
    $("serialInput").value.trim() || "از طریق مرورگر قابل‌خواندن نیست";

  // Do not claim factory color based on connection data.
  $("factoryColor").textContent =
    $("colorSelect").value || "از اتصال دسته قابل‌تشخیص نیست";

  if (animationId === null) {
    animationId = requestAnimationFrame(animate);
  }
}

function disconnectPad() {
  activeIndex = null;
  lastPad = null;

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  $("connection").textContent = "دسته متصل نیست";
  $("connection").classList.remove("connected");
  $("connectionInfo").textContent = "قطع";
  $("controllerModel").textContent = "نامشخص";
  $("deviceId").textContent = "نامشخص";
  $("mappingInfo").textContent = "نامشخص";

  document.querySelectorAll(".key.active").forEach((key) => {
    key.classList.remove("active");
  });

  document.querySelectorAll(".meter div").forEach((meter) => {
    meter.style.width = "0%";
  });

  $("leftDot").style.transform = "translate(0, 0)";
  $("rightDot").style.transform = "translate(0, 0)";
  $("leftValues").textContent = "0.00 / 0.00";
  $("rightValues").textContent = "0.00 / 0.00";
  $("l2Value").textContent = "0%";
  $("r2Value").textContent = "0%";
  $("buttonCount").textContent = "۰ دکمه فعال";
  $("stickStatus").textContent =
    "برای تست آنالوگ، دسته را وصل کنید.";

  lastButtonCount = -1;
  lastStatusText = "";
}

window.addEventListener("gamepadconnected", (event) => {
  connectPad(event.gamepad);
});

window.addEventListener("gamepaddisconnected", (event) => {
  if (activeIndex === event.gamepad.index) {
    disconnectPad();

    // Check whether another controller remains connected.
    const anotherPad = findPad();
    if (anotherPad) connectPad(anotherPad);
  }
});

// ---------- Visual helpers ----------

function setMeter(id, value) {
  const element = $(id);
  const percent = Math.max(0, Math.min(100, value));

  element.style.width = `${percent}%`;
}

function moveDot(id, x, y) {
  const limit = 38;

  $(id).style.transform =
    `translate(${x * limit}px, ${y * limit}px)`;
}

function formatAxis(value) {
  return Number(value || 0).toFixed(2);
}

function setTextIfChanged(id, value) {
  const element = $(id);

  if (element.textContent !== value) {
    element.textContent = value;
  }
}

// ---------- Live controller testing ----------

function animate() {
  animationId = null;

  const pad = findPad();

  if (!pad) {
    disconnectPad();
    return;
  }

  lastPad = pad;

  let pressedCount = 0;

  document.querySelectorAll(".key[data-button]").forEach((key) => {
    const index = Number(key.dataset.button);
    const button = pad.buttons[index];

    const pressed = Boolean(
      button && (button.pressed || button.value > 0.5)
    );

    key.classList.toggle("active", pressed);

    if (pressed) pressedCount++;
  });

  if (pressedCount !== lastButtonCount) {
    setTextIfChanged(
      "buttonCount",
      `${pressedCount} دکمه فعال`
    );

    lastButtonCount = pressedCount;
  }

  // Standard Gamepad API axis positions:
  // 0 = left X, 1 = left Y, 2 = right X, 3 = right Y.
  const axes = pad.axes || [];

  const lx = axes[0] ?? 0;
  const ly = axes[1] ?? 0;
  const rx = axes[2] ?? 0;
  const ry = axes[3] ?? 0;

  setTextIfChanged(
    "leftValues",
    `${formatAxis(lx)} / ${formatAxis(ly)}`
  );

  setTextIfChanged(
    "rightValues",
    `${formatAxis(rx)} / ${formatAxis(ry)}`
  );

  moveDot("leftDot", lx, ly);
  moveDot("rightDot", rx, ry);

  setMeter("leftMeter", Math.hypot(lx, ly) * 50);
  setMeter("rightMeter", Math.hypot(rx, ry) * 50);

  // Standard mapping: button 6 = L2, button 7 = R2.
  const l2 = pad.buttons[6]?.value ?? 0;
  const r2 = pad.buttons[7]?.value ?? 0;

  setTextIfChanged("l2Value", `${Math.round(l2 * 100)}%`);
  setTextIfChanged("r2Value", `${Math.round(r2 * 100)}%`);

  setMeter("l2Meter", l2 * 100);
  setMeter("r2Meter", r2 * 100);

  // This is a center-position hint, not a definitive drift diagnosis.
  const deadzone = 0.15;
  const moving =
    Math.hypot(lx, ly) > deadzone ||
    Math.hypot(rx, ry) > deadzone;

  const status = moving
    ? "حرکت آنالوگ شناسایی شد؛ برای بررسی مرکز، دسته را رها کنید."
    : "آنالوگ‌ها نزدیک مرکز هستند؛ برای تست مرکز، دسته را رها نگه دارید.";

  if (status !== lastStatusText) {
    $("stickStatus").textContent = status;
    lastStatusText = status;
  }

  animationId = requestAnimationFrame(animate);
}

// ---------- Connect button ----------

$("connectBtn").addEventListener("click", () => {
  const pad = findPad();

  if (pad) {
    connectPad(pad);
    return;
  }

  if (!navigator.getGamepads) {
    $("connection").textContent =
      "این مرورگر از Gamepad API پشتیبانی نمی‌کند.";
    return;
  }

  $("connection").textContent =
    "دسته را وصل کنید و یک دکمه را فشار دهید.";

  scanMessage =
    "برای شناسایی دسته، آن را متصل کنید و یک دکمه فشار دهید.";
});

// ---------- Manual serial and color ----------

$("saveInfoBtn").addEventListener("click", () => {
  const serial = $("serialInput").value.trim();
  const color = $("colorSelect").value;

  $("serialNumber").textContent =
    serial || "شماره سریال وارد نشده";

  $("factoryColor").textContent =
    color || "تأیید نشده";

  $("manualStatus").textContent =
    "اطلاعات دستی ثبت شد؛ اصالت سریال و رنگ به‌صورت مستقل تأیید نشده‌اند.";
});

// Update displayed manual values while editing.
$("serialInput").addEventListener("input", () => {
  const serial = $("serialInput").value.trim();

  if (serial) {
    $("serialNumber").textContent = serial;
  } else if (lastPad) {
    $("serialNumber").textContent =
      "از طریق مرورگر قابل‌خواندن نیست";
  } else {
    $("serialNumber").textContent = "وارد نشده";
  }
});

$("colorSelect").addEventListener("change", () => {
  const color = $("colorSelect").value;

  $("factoryColor").textContent =
    color || "تأیید نشده";
});

// ---------- Test report ----------

$("reportBtn").addEventListener("click", () => {
  const pad = findPad();

  const serial =
    $("serialInput").value.trim() || "وارد نشده";

  const color =
    $("colorSelect").value || "تأیید نشده";

  const report = [
    "گزارش تست دسته",
    "========================",
    `وضعیت اتصال: ${pad ? "متصل" : "قطع"}`,
    `مدل احتمالی: ${pad ? detectModel(pad.id) : "نامشخص"}`,
    `شناسه گزارش‌شده: ${pad?.id || "نامشخص"}`,
    `Mapping: ${pad?.mapping || "نامشخص"}`,
    `تعداد دکمه‌ها: ${pad?.buttons?.length ?? "نامشخص"}`,
    `تعداد محورهای آنالوگ: ${pad?.axes?.length ?? "نامشخص"}`,
    `شماره سریال واردشده: ${serial}`,
    `رنگ واردشده: ${color}`,
    "",
    "محدودیت‌ها:",
    "- شماره سریال از Gamepad API دریافت نمی‌شود.",
    "- رنگ واقعی بدنه و رنگ کارخانه از اتصال دسته مشخص نمی‌شوند.",
    "- شناسه و نام گزارش‌شده، اصالت دسته را اثبات نمی‌کنند."
  ];

  $("report").textContent = report.join("\n");
});

// ---------- Language direction toggle ----------

$("langBtn").addEventListener("click", () => {
  const currentlyPersian =
    document.documentElement.lang === "fa";

  document.documentElement.lang =
    currentlyPersian ? "en" : "fa";

  document.documentElement.dir =
    currentlyPersian ? "ltr" : "rtl";

  $("langBtn").textContent =
    currentlyPersian ? "فارسی" : "English";
});

// ---------- Initial browser check ----------

if (!navigator.getGamepads) {
  $("connection").textContent =
    "مرورگر شما از Gamepad API پشتیبانی نمی‌کند.";
} else {
  const existingPad = findPad();

  if (existingPad) {
    connectPad(existingPad);
  }
}
```
