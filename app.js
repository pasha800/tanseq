(function () {
  "use strict";

  const WHATSAPP_NUMBER = "9647514705065";
  const LOGIN_USER = "admin";
  const LOGIN_PASS = "12345";
  const SESSION_KEY = "hemahangi_logged_in";
  const STORAGE_KEY = "hemahangi_form_draft";

  const COORDINATION_LABELS = {
    import_goods: "هەماهەنگی هێنانەژوورەوەی کەل و پەل",
    partner_workers: "هەماهەنگی کارکردنی کرێکاران لای هاوپەیمانان",
  };

  const PLATE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const CAR_BRANDS_WITH_MODELS = {
    Toyota: ["Corolla", "Camry", "Land Cruiser", "Hilux", "Prado", "RAV4", "Yaris", "هی تر"],
    Nissan: ["Patrol", "X-Trail", "Sunny", "Altima", "Navara", "هی تر"],
    Hyundai: ["Sonata", "Elantra", "Tucson", "Santa Fe", "Accent", "هی تر"],
    Kia: ["Sportage", "Sorento", "Cerato", "Rio", "Carnival", "هی تر"],
    Mitsubishi: ["Pajero", "L200", "Lancer", "Outlander", "هی تر"],
    Chevrolet: ["Tahoe", "Suburban", "Malibu", "Cruze", "Silverado", "هی تر"],
    GMC: ["Yukon", "Sierra", "Terrain", "هی تر"],
    Ford: ["F-150", "Explorer", "Ranger", "Escape", "هی تر"],
    Mercedes: ["C-Class", "E-Class", "G-Class", "Sprinter", "هی تر"],
    BMW: ["3 Series", "5 Series", "X5", "X7", "هی تر"],
    Lexus: ["LX", "RX", "ES", "GX", "هی تر"],
  };

  const CAR_STANDALONE_TYPES = [
    "Land Cruiser", "Hilux", "Prado", "Corolla", "Camry",
    "Sonata", "Elantra", "Tucson", "Santa Fe", "Sportage", "Sorento",
    "Pickup", "Truck", "Bus", "Van",
  ];

  const GOODS_ITEMS = [
    "مۆبایل",
    "لابتۆپ",
    "ئایپاد / تابلێت",
    "کامێرا",
    "پرینتەر",
    "ئامێری کار",
    "کەل و پەلی ئۆفیس",
    "بەڵگەنامە",
    "هی تر",
  ];

  const STEP_LABELS = { 2: "جۆری هەماهەنگی", 3: "زانیاری کۆمپانیا", 4: "کرێکاران", 5: "ناردن" };

  let workerCount = 0;
  let currentStep = 1;
  let saveTimer = null;
  let restoring = false;

  const state = {
    coordinationType: "",
    company: { name: "", contractNumber: "", contractDate: "", coordinationDate: "" },
    notes: "",
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // --- Helpers ---
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function toKurdishDigits(value) {
    return String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  }

  function getSelectedRadio(group, selector) {
    const checked = group.querySelector(selector + ":checked");
    return checked ? checked.value : "";
  }

  function buildCheckboxGrid(container, className, prefix) {
    container.innerHTML = "";
    GOODS_ITEMS.forEach((item, i) => {
      const id = prefix + "-" + i + "-" + Date.now() + Math.random().toString(36).slice(2, 6);
      const label = document.createElement("label");
      label.className = "check-item";
      label.innerHTML =
        '<input type="checkbox" class="' +
        className +
        '" value="' +
        item +
        '" id="' +
        id +
        '"><span>' +
        item +
        "</span>";
      container.appendChild(label);
    });
  }

  function getCheckedValues(card, selector) {
    return $$(selector + ":checked", card).map((cb) => cb.value);
  }

  function formatGoodsList(items, otherText) {
    const list = items.filter((v) => v !== "هی تر");
    if (items.includes("هی تر") && otherText) list.push("هی تر: " + otherText);
    else if (items.includes("هی تر")) list.push("هی تر");
    return list.join("، ");
  }

  function hasCarModelSelect(brand) {
    return Object.prototype.hasOwnProperty.call(CAR_BRANDS_WITH_MODELS, brand);
  }

  function populateCarBrandSelect(select) {
    select.innerHTML = '<option value="">— هەڵبژێرە —</option>';
    Object.keys(CAR_BRANDS_WITH_MODELS).forEach((brand) => {
      const opt = document.createElement("option");
      opt.value = brand;
      opt.textContent = brand;
      select.appendChild(opt);
    });
    CAR_STANDALONE_TYPES.forEach((type) => {
      if (!CAR_BRANDS_WITH_MODELS[type]) {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        select.appendChild(opt);
      }
    });
    const other = document.createElement("option");
    other.value = "هی تر";
    other.textContent = "هی تر";
    select.appendChild(other);
  }

  function populatePlateLetters(select) {
    select.innerHTML = "";
    PLATE_LETTERS.forEach((letter) => {
      const opt = document.createElement("option");
      opt.value = letter;
      opt.textContent = letter;
      select.appendChild(opt);
    });
    select.value = "G";
  }

  function populateCarModelSelect(select, brand) {
    select.innerHTML = '<option value="">— هەڵبژێرە —</option>';
    (CAR_BRANDS_WITH_MODELS[brand] || []).forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model;
      opt.textContent = model;
      select.appendChild(opt);
    });
  }

  function ltrEmbed(text) {
    return text ? "\u200E" + text + "\u200E" : "";
  }

  function formatPlateType1(code, letter, num) {
    if (!code || !letter || !num) return "";
    return code + " " + String(letter).toUpperCase() + " " + num;
  }

  function formatPlateNumber(card) {
    const type = card.querySelector(".worker-plate-type").value;
    if (type === "type1") {
      const code = card.querySelector(".worker-plate-code").value;
      const letter = card.querySelector(".worker-plate-letter").value;
      const num = card.querySelector(".worker-plate-num").value.trim();
      return formatPlateType1(code, letter, num);
    }
    if (type === "type2") {
      const num = card.querySelector(".worker-plate2-num").value.trim();
      const citySel = card.querySelector(".worker-plate2-city");
      const opt = citySel.selectedOptions[0];
      const plateCity = opt && opt.dataset.plate ? opt.dataset.plate : "";
      if (!num || !plateCity) return "";
      return num + " " + plateCity;
    }
    return "";
  }

  function updatePlateLiveDisplay(card) {
    const live = card.querySelector(".plate-live-display");
    if (!live) return;
    const code = card.querySelector(".worker-plate-code").value || "—";
    const letter = (card.querySelector(".worker-plate-letter").value || "—").toUpperCase();
    const num = card.querySelector(".worker-plate-num").value.trim() || "—";
    live.querySelector(".plate-seg-code").textContent = code;
    live.querySelector(".plate-seg-letter").textContent = letter;
    live.querySelector(".plate-seg-num").textContent = num;
  }

  function updatePlatePreview(card) {
    const type = card.querySelector(".worker-plate-type").value;
    const plate = formatPlateNumber(card);
    const p1 = card.querySelector(".worker-plate-preview1");
    const p2 = card.querySelector(".worker-plate-preview2");

    if (type === "type1") {
      updatePlateLiveDisplay(card);
      if (p1) {
        const valueEl = p1.querySelector(".plate-preview-value");
        if (plate && valueEl) {
          valueEl.textContent = plate;
          p1.hidden = false;
        } else {
          p1.hidden = true;
        }
      }
    } else if (p1) {
      p1.hidden = true;
    }

    if (p2) {
      p2.textContent = type === "type2" && plate ? "ژمارەی ئۆتۆمبێل: " + ltrEmbed(plate) : "";
    }
  }

  function getCarTypeDisplay(card) {
    const brand = card.querySelector(".worker-car-brand").value;
    const brandOther = card.querySelector(".worker-car-brand-other").value.trim();
    const model = card.querySelector(".worker-car-model").value;
    const modelOther = card.querySelector(".worker-car-model-other").value.trim();
    if (brand === "هی تر") return brandOther;
    if (hasCarModelSelect(brand)) {
      if (model === "هی تر") return modelOther ? brand + " — " + modelOther : brand;
      if (model) return brand + " — " + model;
      return "";
    }
    return brand;
  }

  function getCarColorDisplay(card) {
    const color = card.querySelector(".worker-car-color").value;
    if (color === "هی تر") return card.querySelector(".worker-car-color-other").value.trim();
    return color;
  }

  function getDriverFieldErrors(w, card) {
    const errors = [];
    const n = w.index;
    if (!w.plateType) errors.push({ msg: "جۆری ژمارەی ئۆتۆمبێل کرێکار " + n, el: card.querySelector(".worker-plate-type") });
    if (!w.plateNumber) errors.push({ msg: "ژمارەی ئۆتۆمبێلی شۆفێر کرێکار " + n, el: card.querySelector(".worker-plate-type") });
    if (!w.carType) errors.push({ msg: "جۆری ئۆتۆمبێلی کرێکار " + n, el: card.querySelector(".worker-car-brand") });
    if (!w.carColor) errors.push({ msg: "ڕەنگی ئۆتۆمبێلی کرێکار " + n, el: card.querySelector(".worker-car-color") });
    if (w.plateType === "type1") {
      if (!card.querySelector(".worker-plate-code").value) errors.push({ msg: "کۆدی شاری ئۆتۆمبێل کرێکار " + n, el: card.querySelector(".worker-plate-code") });
      if (!card.querySelector(".worker-plate-letter").value) errors.push({ msg: "پیتی ئۆتۆمبێل کرێکار " + n, el: card.querySelector(".worker-plate-letter") });
      if (!card.querySelector(".worker-plate-num").value.trim()) errors.push({ msg: "ژمارەی ئۆتۆمبێل کرێکار " + n, el: card.querySelector(".worker-plate-num") });
    }
    if (w.plateType === "type2") {
      if (!card.querySelector(".worker-plate2-num").value.trim()) errors.push({ msg: "ژمارەی ئۆتۆمبێل کرێکار " + n, el: card.querySelector(".worker-plate2-num") });
      if (!card.querySelector(".worker-plate2-city").value) errors.push({ msg: "شاری ئۆتۆمبێلی شۆفێر کرێکار " + n, el: card.querySelector(".worker-plate2-city") });
    }
    if (hasCarModelSelect(card.querySelector(".worker-car-brand").value) && !card.querySelector(".worker-car-model").value) {
      errors.push({ msg: "مۆدێلی ئۆتۆمبێلی کرێکار " + n, el: card.querySelector(".worker-car-model") });
    }
    if (card.querySelector(".worker-car-brand").value === "هی تر" && !card.querySelector(".worker-car-brand-other").value.trim()) {
      errors.push({ msg: "جۆری ئۆتۆمبێلی تر کرێکار " + n, el: card.querySelector(".worker-car-brand-other") });
    }
    if (card.querySelector(".worker-car-model").value === "هی تر" && !card.querySelector(".worker-car-model-other").value.trim()) {
      errors.push({ msg: "مۆدێلی تر کرێکار " + n, el: card.querySelector(".worker-car-model-other") });
    }
    if (card.querySelector(".worker-car-color").value === "هی تر" && !card.querySelector(".worker-car-color-other").value.trim()) {
      errors.push({ msg: "ڕەنگی تر کرێکار " + n, el: card.querySelector(".worker-car-color-other") });
    }
    return errors;
  }

  // --- DOM refs ---
  const loginForm = $("#loginForm");
  const loginError = $("#loginError");
  const typeForm = $("#typeForm");
  const companyForm = $("#companyForm");
  const workersContainer = $("#workersContainer");
  const workerTemplate = $("#workerTemplate");
  const addWorkerBtn = $("#addWorkerBtn");
  const workersNextBtn = $("#workersNextBtn");
  const sendWhatsAppBtn = $("#sendWhatsAppBtn");
  const copyMessageBtn = $("#copyMessageBtn");
  const clearFormBtn = $("#clearFormBtn");
  const clearSavedBtn = $("#clearSavedBtn");
  const messagePreview = $("#messagePreview");
  const livePreviewPanel = $("#livePreviewPanel");
  const stepsNav = $("#stepsNav");
  const progressText = $("#progressText");
  const progressFill = $("#progressFill");
  const coordinationTypeInput = $("#coordinationType");
  const typeChoices = $("#typeChoices");
  const typeError = $("#typeError");
  const companyBanner = $("#companyBanner");
  const editCompanyBtn = $("#editCompanyBtn");
  const errorSummary = $("#errorSummary");
  const errorList = $("#errorList");
  const copyToast = $("#copyToast");

  // --- Session ---
  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  }

  function setLoggedIn(val) {
    if (val) sessionStorage.setItem(SESSION_KEY, "true");
    else sessionStorage.removeItem(SESSION_KEY);
  }

  // --- Steps ---
  function showStep(stepNum, options) {
    const keepErrors = options && options.keepErrors;
    currentStep = stepNum;
    $$(".step-panel").forEach((panel) => {
      const n = parseInt(panel.dataset.step, 10);
      panel.hidden = n !== stepNum;
    });

    if (stepNum > 1) {
      stepsNav.hidden = false;
      const displayStep = stepNum - 1;
      progressText.textContent =
        "قۆناغ " + toKurdishDigits(displayStep) + " لە " + toKurdishDigits(4) + " — " + (STEP_LABELS[stepNum] || "");
      progressFill.style.width = displayStep / 4 * 100 + "%";
    } else {
      stepsNav.hidden = true;
    }

    companyBanner.hidden = stepNum < 4 || !state.company.name;
    livePreviewPanel.hidden = stepNum < 4;
    if (stepNum >= 4) updatePreview();

    if (stepNum === 3 && !$("#coordinationDate").value) {
      $("#coordinationDate").value = todayISO();
    }

    if (!keepErrors) {
      hideErrorSummary();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (!errorSummary.hidden) {
      requestAnimationFrame(() => {
        errorSummary.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function updateCompanyBanner() {
    const c = state.company;
    if (!c.name) {
      companyBanner.hidden = true;
      return;
    }
    $("#bannerCompany").textContent = c.name;
    $("#bannerContract").textContent = c.contractNumber;
    $("#bannerDate").textContent = c.coordinationDate || c.contractDate || "—";
    if (currentStep >= 4) companyBanner.hidden = false;
  }

  editCompanyBtn.addEventListener("click", () => showStep(3));

  // --- Errors ---
  function clearFieldError(el) {
    if (!el) return;
    el.classList.remove("invalid");
    const group = el.closest(".form-group");
    if (group) {
      const err = group.querySelector(".field-error");
      if (err) err.textContent = "";
    }
    const checkGrid = el.closest(".checkbox-grid");
    if (checkGrid) checkGrid.classList.remove("invalid");
  }

  function setFieldError(el, msg) {
    if (!el) return;
    el.classList.add("invalid");
    const group = el.closest(".form-group") || el.closest(".worker-card");
    if (group) {
      const err = group.querySelector('[data-field="' + (el.dataset?.field || "") + '"]') ||
        el.parentElement.querySelector(".field-error") ||
        (el.closest(".form-group") && el.closest(".form-group").querySelector(".field-error"));
      // simpler: find sibling field-error in same form-group
      const fg = el.closest(".form-group");
      if (fg) {
        const fe = fg.querySelector(".field-error");
        if (fe && msg) fe.textContent = msg;
      }
    }
    if (el.classList.contains("checkbox-grid") || el.closest(".checkbox-grid")) {
      (el.classList.contains("checkbox-grid") ? el : el.closest(".checkbox-grid")).classList.add("invalid");
    }
  }

  function hideErrorSummary() {
    errorSummary.hidden = true;
    errorList.innerHTML = "";
  }

  function showErrorSummary(errors) {
    if (!errors.length) {
      hideErrorSummary();
      return;
    }
    errorList.innerHTML = errors.map((e) => "<li>" + e + "</li>").join("");
    errorSummary.hidden = false;
    errorSummary.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function validateRequired(input, label) {
    const val = (input.value || "").trim();
    if (!val) {
      setFieldError(input, "تکایە " + label + " پڕ بکەرەوە");
      return false;
    }
    clearFieldError(input);
    return true;
  }

  // --- Collect & validate ---
  function getNationality(card) {
    const sel = card.querySelector(".worker-nationality").value;
    if (sel === "هی تر") {
      const other = card.querySelector(".worker-nationality-other").value.trim();
      return other ? "هی تر: " + other : "";
    }
    return sel;
  }

  function collectWorkerFromCard(card, i) {
    const goodsChecked = getCheckedValues(card, ".worker-goods-cb");
    const importChecked = getCheckedValues(card, ".worker-import-cb");
    const isDriver = getSelectedRadio(card, ".worker-is-driver");
    return {
      index: i + 1,
      name: card.querySelector(".worker-name").value.trim(),
      nationality: getNationality(card),
      nationalityRaw: card.querySelector(".worker-nationality").value,
      nationalityOther: card.querySelector(".worker-nationality-other").value.trim(),
      isDriver,
      plateType: isDriver === "yes" ? card.querySelector(".worker-plate-type").value : "",
      plateCode: card.querySelector(".worker-plate-code").value,
      plateLetter: card.querySelector(".worker-plate-letter").value,
      plateNum: card.querySelector(".worker-plate-num").value.trim(),
      plate2Num: card.querySelector(".worker-plate2-num").value.trim(),
      plate2City: card.querySelector(".worker-plate2-city").value,
      plateNumber: isDriver === "yes" ? formatPlateNumber(card) : "",
      carBrand: card.querySelector(".worker-car-brand").value,
      carBrandOther: card.querySelector(".worker-car-brand-other").value.trim(),
      carModel: card.querySelector(".worker-car-model").value,
      carModelOther: card.querySelector(".worker-car-model-other").value.trim(),
      carType: isDriver === "yes" ? getCarTypeDisplay(card) : "",
      carColorRaw: card.querySelector(".worker-car-color").value,
      carColorOther: card.querySelector(".worker-car-color-other").value.trim(),
      carColor: isDriver === "yes" ? getCarColorDisplay(card) : "",
      goodsItems: goodsChecked,
      goodsOther: card.querySelector(".worker-goods-other").value.trim(),
      goods: formatGoodsList(goodsChecked, card.querySelector(".worker-goods-other").value.trim()),
      mobileType: getSelectedRadio(card, ".worker-mobile-type"),
      importItems: importChecked,
      importOther: card.querySelector(".worker-import-other").value.trim(),
      importGoods: formatGoodsList(importChecked, card.querySelector(".worker-import-other").value.trim()),
      card,
    };
  }

  function collectWorkersFromDOM() {
    return $$(".worker-card").map((card, i) => collectWorkerFromCard(card, i));
  }

  function collectAllErrors() {
    const errors = [];
    const isImport = state.coordinationType === "import_goods";

    if (!state.coordinationType) errors.push("جۆری هەماهەنگی");

    if (!$("#companyName").value.trim()) errors.push("ناوی کۆمپانیا");
    if (!$("#contractNumber").value.trim()) errors.push("ژمارەی نووسراوی گرێبەست");
    if (!$("#contractDate").value) errors.push("ڕێکەوتی نووسراوی گرێبەست");
    if (!$("#coordinationDate").value) errors.push("ڕێکەوتی هەماهەنگی");

    collectWorkersFromDOM().forEach((w) => {
      const n = w.index;
      if (!w.name) errors.push("ناوی چوارانی کرێکار " + n);
      if (!w.nationality) errors.push("نەتەوەی کرێکار " + n);
      if (w.isDriver === "yes") {
        getDriverFieldErrors(w, w.card).forEach((e) => errors.push(e.msg));
      }
      if (!w.mobileType) errors.push("جۆری مۆبایلی کرێکار " + n);
      if (isImport) {
        if (!w.goodsItems.length) errors.push("کەل و پەلی کرێکار " + n);
        if (!w.importItems.length) errors.push("جۆری کەل و پەل بۆ هێنانەژوورەوەی کرێکار " + n);
        if (w.goodsItems.includes("هی تر") && !w.goodsOther) errors.push("کەل و پەلی تر کرێکار " + n);
        if (w.importItems.includes("هی تر") && !w.importOther) errors.push("جۆری تر بۆ هێنانەژوورەوەی کرێکار " + n);
      }
    });

    return errors;
  }

  function validateWorkers(markFields, showSummary) {
    if (showSummary === undefined) showSummary = markFields;
    let valid = true;
    const isImport = state.coordinationType === "import_goods";
    const errors = [];

    collectWorkersFromDOM().forEach((w) => {
      const { card } = w;
      const n = w.index;

      if (!w.name) {
        if (markFields) setFieldError(card.querySelector(".worker-name"), "");
        errors.push("ناوی چوارانی کرێکار " + n);
        valid = false;
      }
      if (!w.nationality) {
        if (markFields) setFieldError(card.querySelector(".worker-nationality"), "");
        errors.push("نەتەوەی کرێکار " + n);
        valid = false;
      }
      if (w.isDriver === "yes") {
        getDriverFieldErrors(w, card).forEach((e) => {
          if (markFields && e.el) setFieldError(e.el, "");
          errors.push(e.msg);
          valid = false;
        });
      }
      if (!w.mobileType) {
        if (markFields) card.querySelector(".worker-mobile-group").classList.add("invalid");
        errors.push("جۆری مۆبایلی کرێکار " + n);
        valid = false;
      }
      if (isImport) {
        const goodsGrid = card.querySelector(".worker-goods-checkboxes");
        if (!w.goodsItems.length) {
          if (markFields) goodsGrid.classList.add("invalid");
          errors.push("کەل و پەلی کرێکار " + n);
          valid = false;
        }
        if (w.goodsItems.includes("هی تر") && !w.goodsOther) {
          if (markFields) setFieldError(card.querySelector(".worker-goods-other"), "");
          errors.push("کەل و پەلی تر کرێکار " + n);
          valid = false;
        }
        const importGrid = card.querySelector(".worker-import-checkboxes");
        if (!w.importItems.length) {
          if (markFields) importGrid.classList.add("invalid");
          errors.push("جۆری کەل و پەل بۆ هێنانەژوورەوەی کرێکار " + n);
          valid = false;
        }
        if (w.importItems.includes("هی تر") && !w.importOther) {
          if (markFields) setFieldError(card.querySelector(".worker-import-other"), "");
          errors.push("جۆری تر بۆ هێنانەژوورەوەی کرێکار " + n);
          valid = false;
        }
      }
    });

    if (!valid && markFields && showSummary) showErrorSummary(errors);
    return valid;
  }

  function validateCompany(markFields) {
    const errors = [];
    if (!$("#companyName").value.trim()) errors.push("ناوی کۆمپانیا");
    if (!$("#contractNumber").value.trim()) errors.push("ژمارەی نووسراوی گرێبەست");
    if (!$("#contractDate").value) errors.push("ڕێکەوتی نووسراوی گرێبەست");
    if (!$("#coordinationDate").value) errors.push("ڕێکەوتی هەماهەنگی");
    if (errors.length && markFields) {
      if (!$("#companyName").value.trim()) $("#companyName").classList.add("invalid");
      if (!$("#contractNumber").value.trim()) $("#contractNumber").classList.add("invalid");
      if (!$("#contractDate").value) $("#contractDate").classList.add("invalid");
      if (!$("#coordinationDate").value) $("#coordinationDate").classList.add("invalid");
      showErrorSummary(errors);
      return false;
    }
    syncStateFromDOM();
    return !errors.length;
  }

  function validateAll(markFields) {
    hideErrorSummary();
    if (!state.coordinationType && !coordinationTypeInput.value) {
      if (markFields) {
        showStep(2, { keepErrors: true });
        typeError.hidden = false;
        showErrorSummary(["جۆری هەماهەنگی"]);
      }
      return false;
    }
    state.coordinationType = coordinationTypeInput.value || state.coordinationType;

    const errors = collectAllErrors();
    if (errors.length) {
      if (markFields) {
        showErrorSummary(errors);
        if (!$("#companyName").value.trim()) $("#companyName").classList.add("invalid");
        if (!$("#contractNumber").value.trim()) $("#contractNumber").classList.add("invalid");
        if (!$("#contractDate").value) $("#contractDate").classList.add("invalid");
        if (!$("#coordinationDate").value) $("#coordinationDate").classList.add("invalid");
        validateWorkers(true, false);
        const hasCompanyErr = errors.some((e) => !e.includes("کرێکار"));
        const hasWorkerErr = errors.some((e) => e.includes("کرێکار"));
        if (hasCompanyErr) showStep(3, { keepErrors: true });
        else if (hasWorkerErr) showStep(4, { keepErrors: true });
      }
      return false;
    }
    syncStateFromDOM();
    return true;
  }

  function syncStateFromDOM() {
    state.coordinationType = coordinationTypeInput.value;
    state.company = {
      name: $("#companyName").value.trim(),
      contractNumber: $("#contractNumber").value.trim(),
      contractDate: $("#contractDate").value,
      coordinationDate: $("#coordinationDate").value,
    };
    state.notes = $("#notes").value.trim();
    updateCompanyBanner();
  }

  // --- Message ---
  function buildMessage() {
    syncStateFromDOM();
    const type = COORDINATION_LABELS[state.coordinationType] || "";
    const c = state.company;
    const workers = collectWorkersFromDOM();
    const notes = state.notes;
    const isImport = state.coordinationType === "import_goods";

    let msg = "";
    msg += "جۆری هەماهەنگی:\n" + type + "\n\n";
    msg += "ڕێکەوتی هەماهەنگی / گرێبەست بۆ:\n" + (c.coordinationDate || "") + "\n\n";
    msg += "زانیارییەکانی کۆمپانیا:\n";
    msg += "ناوی کۆمپانیا: " + c.name + "\n";
    msg += "ژمارەی نووسراوی گرێبەست: " + c.contractNumber + "\n";
    msg += "ڕێکەوتی نووسراوی گرێبەست: " + c.contractDate + "\n\n";
    msg += "زانیارییەکانی کرێکاران:\n";

    workers.forEach((w) => {
      msg += "کرێکار " + w.index + ":\n";
      msg += "ناوی چوارانی: " + w.name + "\n";
      msg += "نەتەوە: " + w.nationality + "\n";
      msg += "ئایا شۆفێرە؟ " + (w.isDriver === "yes" ? "بەڵێ" : "نەخێر") + "\n";
      if (w.isDriver === "yes") {
        msg += "ژمارەی ئۆتۆمبێل: " + ltrEmbed(w.plateNumber) + "\n";
        msg += "جۆری ئۆتۆمبێل: " + w.carType + "\n";
        msg += "ڕەنگی ئۆتۆمبێل: " + w.carColor + "\n";
      }
      if (isImport && w.goods) msg += "کەل و پەل لە لایە: " + w.goods + "\n";
      msg += "جۆری مۆبایل: " + w.mobileType + "\n";
      if (isImport && w.importGoods) msg += "جۆری کەل و پەل بۆ هێنانەژوورەوە: " + w.importGoods + "\n";
      msg += "\n";
    });

    if (notes) msg += "تێبینی:\n" + notes + "\n";
    return msg.trim();
  }

  function updatePreview() {
    if (currentStep < 4) return;
    messagePreview.textContent = buildMessage() || "زانیارییەکان پڕ بکەرەوە بۆ بینینی نامەکە...";
  }

  // --- Worker card ---
  function updateWorkerFieldRequirements() {
    const isImport = state.coordinationType === "import_goods";
    $$(".worker-card").forEach((card) => {
      const goodsGroup = card.querySelector(".worker-goods-group");
      const importGroup = card.querySelector(".worker-import-group");
      const goodsMark = card.querySelector(".goods-required-mark");

      if (goodsGroup) goodsGroup.hidden = !isImport;
      if (importGroup) importGroup.hidden = !isImport;
      if (goodsMark) goodsMark.hidden = !isImport;

      if (!isImport) {
        $$(".worker-goods-cb", card).forEach((cb) => (cb.checked = false));
        $$(".worker-import-cb", card).forEach((cb) => (cb.checked = false));
        card.querySelector(".worker-goods-other").value = "";
        card.querySelector(".worker-import-other").value = "";
        card.querySelector(".worker-goods-other-wrap").hidden = true;
        card.querySelector(".worker-import-other-wrap").hidden = true;
      }
    });
  }

  function toggleOtherWrap(card, otherWrap, selector) {
    const hasOther = $$(selector, card).some((cb) => cb.checked && cb.value === "هی تر");
    otherWrap.hidden = !hasOther;
    if (!hasOther) otherWrap.querySelector("input").value = "";
  }

  function toggleNationalityOther(card) {
    const isOther = card.querySelector(".worker-nationality").value === "هی تر";
    card.querySelector(".worker-nationality-other-wrap").hidden = !isOther;
    if (!isOther) card.querySelector(".worker-nationality-other").value = "";
  }

  function clearDriverFields(card) {
    card.querySelector(".worker-plate-type").value = "";
    card.querySelector(".worker-plate-code").value = "";
    card.querySelector(".worker-plate-letter").value = "G";
    card.querySelector(".worker-plate-num").value = "";
    card.querySelector(".worker-plate2-num").value = "";
    card.querySelector(".worker-plate2-city").value = "";
    card.querySelector(".worker-car-brand").value = "";
    card.querySelector(".worker-car-model").value = "";
    card.querySelector(".worker-car-brand-other").value = "";
    card.querySelector(".worker-car-model-other").value = "";
    card.querySelector(".worker-car-color").value = "";
    card.querySelector(".worker-car-color-other").value = "";
    togglePlateTypeFields(card);
    toggleCarBrandFields(card);
    toggleCarColorOther(card);
    updatePlatePreview(card);
  }

  function togglePlateTypeFields(card) {
    const type = card.querySelector(".worker-plate-type").value;
    card.querySelector(".plate-type1-fields").hidden = type !== "type1";
    card.querySelector(".plate-type2-fields").hidden = type !== "type2";
    if (type !== "type1") {
      const live = card.querySelector(".plate-live-display");
      if (live) {
        live.querySelector(".plate-seg-code").textContent = "—";
        live.querySelector(".plate-seg-letter").textContent = "—";
        live.querySelector(".plate-seg-num").textContent = "—";
      }
    }
    updatePlatePreview(card);
  }

  function toggleCarBrandFields(card) {
    const brand = card.querySelector(".worker-car-brand").value;
    const modelGroup = card.querySelector(".worker-car-model-group");
    const brandOtherWrap = card.querySelector(".worker-car-brand-other-wrap");
    const modelOtherWrap = card.querySelector(".worker-car-model-other-wrap");
    const modelSelect = card.querySelector(".worker-car-model");

    brandOtherWrap.hidden = brand !== "هی تر";
    if (brand !== "هی تر") card.querySelector(".worker-car-brand-other").value = "";

    if (hasCarModelSelect(brand)) {
      modelGroup.hidden = false;
      populateCarModelSelect(modelSelect, brand);
    } else {
      modelGroup.hidden = true;
      modelSelect.value = "";
      modelOtherWrap.hidden = true;
      card.querySelector(".worker-car-model-other").value = "";
    }

    if (brand === "هی تر") {
      modelGroup.hidden = true;
      modelSelect.value = "";
      modelOtherWrap.hidden = true;
    }

    toggleCarModelOther(card);
  }

  function toggleCarModelOther(card) {
    const model = card.querySelector(".worker-car-model").value;
    const wrap = card.querySelector(".worker-car-model-other-wrap");
    wrap.hidden = model !== "هی تر";
    if (model !== "هی تر") card.querySelector(".worker-car-model-other").value = "";
  }

  function toggleCarColorOther(card) {
    const color = card.querySelector(".worker-car-color").value;
    const wrap = card.querySelector(".worker-car-color-other-wrap");
    wrap.hidden = color !== "هی تر";
    if (color !== "هی تر") card.querySelector(".worker-car-color-other").value = "";
  }

  function toggleDriverFields(card) {
    const isDriver = getSelectedRadio(card, ".worker-is-driver") === "yes";
    card.querySelector(".driver-fields").hidden = !isDriver;
    if (!isDriver) clearDriverFields(card);
  }

  function applyDriverDataToCard(card, w) {
    card.querySelector(".worker-plate-type").value = w.plateType || "";
    togglePlateTypeFields(card);
    card.querySelector(".worker-plate-code").value = w.plateCode || "";
    card.querySelector(".worker-plate-letter").value = w.plateLetter || "G";
    card.querySelector(".worker-plate-num").value = w.plateNum || "";
    card.querySelector(".worker-plate2-num").value = w.plate2Num || "";
    card.querySelector(".worker-plate2-city").value = w.plate2City || "";
    card.querySelector(".worker-car-brand").value = w.carBrand || "";
    toggleCarBrandFields(card);
    if (w.carModel) card.querySelector(".worker-car-model").value = w.carModel;
    toggleCarModelOther(card);
    card.querySelector(".worker-car-brand-other").value = w.carBrandOther || "";
    card.querySelector(".worker-car-model-other").value = w.carModelOther || "";
    card.querySelector(".worker-car-color").value = w.carColorRaw || "";
    toggleCarColorOther(card);
    card.querySelector(".worker-car-color-other").value = w.carColorOther || "";
    updatePlatePreview(card);
  }

  function copyFromPrevious(card, prevCard) {
    const prev = collectWorkerFromCard(prevCard, 0);
    card.querySelector(".worker-nationality").value = prev.nationalityRaw;
    card.querySelector(".worker-nationality-other").value = prev.nationalityOther;
    toggleNationalityOther(card);

    card.querySelectorAll(".worker-is-driver").forEach((r) => {
      r.checked = r.value === prev.isDriver;
    });
    toggleDriverFields(card);
    if (prev.isDriver === "yes") applyDriverDataToCard(card, prev);

    card.querySelectorAll(".worker-goods-cb").forEach((cb) => {
      cb.checked = prev.goodsItems.includes(cb.value);
    });
    card.querySelector(".worker-goods-other").value = prev.goodsOther;
    toggleOtherWrap(card, card.querySelector(".worker-goods-other-wrap"), ".worker-goods-cb");

    card.querySelectorAll(".worker-mobile-type").forEach((r) => {
      r.checked = r.value === prev.mobileType;
    });

    card.querySelectorAll(".worker-import-cb").forEach((cb) => {
      cb.checked = prev.importItems.includes(cb.value);
    });
    card.querySelector(".worker-import-other").value = prev.importOther;
    toggleOtherWrap(card, card.querySelector(".worker-import-other-wrap"), ".worker-import-cb");

    card.querySelector(".worker-name").focus();
    scheduleSave();
    updatePreview();
  }

  function bindWorkerCard(card) {
    const uid = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const driverName = "driver-" + uid;
    const mobileName = "mobile-" + uid;

    buildCheckboxGrid(card.querySelector(".worker-goods-checkboxes"), "worker-goods-cb", "goods");
    buildCheckboxGrid(card.querySelector(".worker-import-checkboxes"), "worker-import-cb", "import");
    populatePlateLetters(card.querySelector(".worker-plate-letter"));
    populateCarBrandSelect(card.querySelector(".worker-car-brand"));

    card.querySelector(".worker-plate-type").addEventListener("change", () => {
      togglePlateTypeFields(card);
      clearFieldError(card.querySelector(".worker-plate-type"));
      onFormChange();
    });

    ["worker-plate-code", "worker-plate-letter", "worker-plate-num", "worker-plate2-num", "worker-plate2-city"].forEach((cls) => {
      card.querySelector("." + cls).addEventListener("input", () => { updatePlatePreview(card); onFormChange(); });
      card.querySelector("." + cls).addEventListener("change", () => { updatePlatePreview(card); onFormChange(); });
    });

    card.querySelector(".worker-car-brand").addEventListener("change", () => {
      toggleCarBrandFields(card);
      clearFieldError(card.querySelector(".worker-car-brand"));
      onFormChange();
    });
    card.querySelector(".worker-car-model").addEventListener("change", () => {
      toggleCarModelOther(card);
      clearFieldError(card.querySelector(".worker-car-model"));
      onFormChange();
    });
    card.querySelector(".worker-car-color").addEventListener("change", () => {
      toggleCarColorOther(card);
      clearFieldError(card.querySelector(".worker-car-color"));
      onFormChange();
    });

    card.querySelectorAll(".worker-is-driver").forEach((r) => {
      r.name = driverName;
      r.addEventListener("change", () => { toggleDriverFields(card); onFormChange(); });
    });
    card.querySelectorAll(".worker-mobile-type").forEach((r) => {
      r.name = mobileName;
      r.addEventListener("change", () => { clearFieldError(card.querySelector(".worker-mobile-group")); onFormChange(); });
    });

    card.querySelector(".worker-nationality").addEventListener("change", () => {
      toggleNationalityOther(card);
      onFormChange();
    });

    const goodsOtherWrap = card.querySelector(".worker-goods-other-wrap");
    $$(".worker-goods-cb", card).forEach((cb) => {
      cb.addEventListener("change", () => {
        toggleOtherWrap(card, goodsOtherWrap, ".worker-goods-cb");
        card.querySelector(".worker-goods-checkboxes").classList.remove("invalid");
        onFormChange();
      });
    });

    const importOtherWrap = card.querySelector(".worker-import-other-wrap");
    $$(".worker-import-cb", card).forEach((cb) => {
      cb.addEventListener("change", () => {
        toggleOtherWrap(card, importOtherWrap, ".worker-import-cb");
        card.querySelector(".worker-import-checkboxes").classList.remove("invalid");
        onFormChange();
      });
    });

    toggleDriverFields(card);
    toggleNationalityOther(card);
    updateWorkerFieldRequirements();

    card.querySelector(".btn-remove-worker").addEventListener("click", () => {
      if ($$(".worker-card").length <= 1) return;
      card.remove();
      renumberWorkers();
      onFormChange();
    });

    card.querySelector(".btn-copy-prev").addEventListener("click", () => {
      const cards = $$(".worker-card");
      const idx = cards.indexOf(card);
      if (idx > 0) copyFromPrevious(card, cards[idx - 1]);
    });

    $$("input, select, textarea", card).forEach((el) => {
      el.addEventListener("input", () => { clearFieldError(el); onFormChange(); });
      el.addEventListener("change", () => { clearFieldError(el); onFormChange(); });
    });
  }

  function renumberWorkers() {
    const cards = $$(".worker-card");
    cards.forEach((card, i) => {
      card.querySelector(".worker-num").textContent = i + 1;
      card.querySelector(".btn-remove-worker").hidden = cards.length <= 1;
      card.querySelector(".btn-copy-prev").hidden = i === 0;
    });
    workerCount = cards.length;
  }

  function addWorker() {
    workersContainer.appendChild(workerTemplate.content.cloneNode(true));
    const card = workersContainer.lastElementChild;
    bindWorkerCard(card);
    renumberWorkers();
    updateWorkerFieldRequirements();
    onFormChange();
  }

  // --- localStorage ---
  function serializeForm() {
    syncStateFromDOM();
    const workers = collectWorkersFromDOM().map((w) => ({
      name: w.name,
      nationalityRaw: w.nationalityRaw,
      nationalityOther: w.nationalityOther,
      isDriver: w.isDriver,
      plateType: w.plateType,
      plateCode: w.plateCode,
      plateLetter: w.plateLetter,
      plateNum: w.plateNum,
      plate2Num: w.plate2Num,
      plate2City: w.plate2City,
      carBrand: w.carBrand,
      carBrandOther: w.carBrandOther,
      carModel: w.carModel,
      carModelOther: w.carModelOther,
      carColorRaw: w.carColorRaw,
      carColorOther: w.carColorOther,
      goodsItems: w.goodsItems,
      goodsOther: w.goodsOther,
      mobileType: w.mobileType,
      importItems: w.importItems,
      importOther: w.importOther,
    }));
    return {
      coordinationType: state.coordinationType,
      company: state.company,
      notes: state.notes,
      workers,
      step: currentStep,
    };
  }

  function scheduleSave() {
    if (restoring || !isLoggedIn()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeForm()));
      } catch (_) { /* quota */ }
    }, 400);
  }

  function onFormChange() {
    hideErrorSummary();
    updatePreview();
    scheduleSave();
  }

  function restoreDraft() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return;
    }
    if (!data) return;

    restoring = true;

    if (data.coordinationType) {
      coordinationTypeInput.value = data.coordinationType;
      state.coordinationType = data.coordinationType;
      $$(".type-choice").forEach((c) => c.classList.toggle("selected", c.dataset.value === data.coordinationType));
    }

    if (data.company) {
      $("#companyName").value = data.company.name || "";
      $("#contractNumber").value = data.company.contractNumber || "";
      $("#contractDate").value = data.company.contractDate || "";
      $("#coordinationDate").value = data.company.coordinationDate || todayISO();
      state.company = { ...data.company };
    }

    if (data.notes) $("#notes").value = data.notes;

    workersContainer.innerHTML = "";
    workerCount = 0;
    const workers = data.workers && data.workers.length ? data.workers : [{}];
    workers.forEach((w) => {
      addWorker();
      const card = workersContainer.lastElementChild;
      card.querySelector(".worker-name").value = w.name || "";
      card.querySelector(".worker-nationality").value = w.nationalityRaw || "";
      card.querySelector(".worker-nationality-other").value = w.nationalityOther || "";
      toggleNationalityOther(card);
      card.querySelectorAll(".worker-is-driver").forEach((r) => { r.checked = r.value === (w.isDriver || "no"); });
      toggleDriverFields(card);
      if ((w.isDriver || "no") === "yes") {
        applyDriverDataToCard(card, {
          plateType: w.plateType || "",
          plateCode: w.plateCode || "",
          plateLetter: w.plateLetter || "G",
          plateNum: w.plateNum || w.carNumber || "",
          plate2Num: w.plate2Num || "",
          plate2City: w.plate2City || w.carCity || "",
          carBrand: w.carBrand || "",
          carBrandOther: w.carBrandOther || "",
          carModel: w.carModel || "",
          carModelOther: w.carModelOther || "",
          carColorRaw: w.carColorRaw || "",
          carColorOther: w.carColorOther || "",
        });
        if (!w.plateType && (w.carNumber || w.carCity)) {
          card.querySelector(".worker-plate-type").value = "type2";
          togglePlateTypeFields(card);
          card.querySelector(".worker-plate2-num").value = w.carNumber || "";
          card.querySelector(".worker-plate2-city").value = w.carCity || "";
          updatePlatePreview(card);
        }
      }
      $$(".worker-goods-cb", card).forEach((cb) => {
        cb.checked = (w.goodsItems || []).includes(cb.value);
      });
      card.querySelector(".worker-goods-other").value = w.goodsOther || "";
      toggleOtherWrap(card, card.querySelector(".worker-goods-other-wrap"), ".worker-goods-cb");
      card.querySelectorAll(".worker-mobile-type").forEach((r) => { r.checked = r.value === w.mobileType; });
      $$(".worker-import-cb", card).forEach((cb) => {
        cb.checked = (w.importItems || []).includes(cb.value);
      });
      card.querySelector(".worker-import-other").value = w.importOther || "";
      toggleOtherWrap(card, card.querySelector(".worker-import-other-wrap"), ".worker-import-cb");
    });

    updateWorkerFieldRequirements();
    updateCompanyBanner();
    restoring = false;

    const step = data.step && data.step >= 2 ? data.step : 2;
    if (isLoggedIn()) showStep(step);
    updatePreview();
  }

  function clearSavedData() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // --- Events ---
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loginError.hidden = true;
    if ($("#username").value.trim() === LOGIN_USER && $("#password").value === LOGIN_PASS) {
      setLoggedIn(true);
      restoreDraft();
      if (!localStorage.getItem(STORAGE_KEY)) showStep(2);
    } else {
      loginError.hidden = false;
    }
  });

  function logout() {
    setLoggedIn(false);
    resetAll(false);
    showStep(1);
    $("#username").value = "";
    $("#password").value = "";
  }

  $("#logoutBtn1").addEventListener("click", logout);

  $$(".btn-back").forEach((btn) => {
    btn.addEventListener("click", () => showStep(parseInt(btn.dataset.back, 10)));
  });

  typeChoices.addEventListener("click", (e) => {
    const btn = e.target.closest(".type-choice");
    if (!btn) return;
    coordinationTypeInput.value = btn.dataset.value;
    state.coordinationType = btn.dataset.value;
    typeError.hidden = true;
    $$(".type-choice").forEach((c) => c.classList.toggle("selected", c === btn));
    updateWorkerFieldRequirements();
    onFormChange();
  });

  typeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!coordinationTypeInput.value) { typeError.hidden = false; return; }
    typeError.hidden = true;
    state.coordinationType = coordinationTypeInput.value;
    updateWorkerFieldRequirements();
    showStep(3);
    onFormChange();
  });

  companyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    hideErrorSummary();
    if (!validateCompany(true)) return;
    if (workerCount === 0) addWorker();
    updateCompanyBanner();
    showStep(4);
    onFormChange();
  });

  addWorkerBtn.addEventListener("click", addWorker);

  workersNextBtn.addEventListener("click", () => {
    hideErrorSummary();
    if (!validateCompany(false)) {
      showErrorSummary(collectAllErrors().filter((e) => !e.includes("کرێکار")));
      showStep(3, { keepErrors: true });
      return;
    }
    if (!validateWorkers(true)) return;
    syncStateFromDOM();
    showStep(5);
    onFormChange();
  });

  sendWhatsAppBtn.addEventListener("click", () => {
    if (!validateAll(true)) return;
    const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(buildMessage());
    window.open(url, "_blank");
  });

  copyMessageBtn.addEventListener("click", async () => {
    if (!validateAll(true)) return;
    const text = buildMessage();
    try {
      await navigator.clipboard.writeText(text);
      copyToast.hidden = false;
      setTimeout(() => { copyToast.hidden = true; }, 2500);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copyToast.hidden = false;
      setTimeout(() => { copyToast.hidden = true; }, 2500);
    }
  });

  clearFormBtn.addEventListener("click", () => {
    if (confirm("دڵنیایت لە پاککردنەوەی هەموو خانەکان؟")) {
      resetAll(true);
      showStep(2);
    }
  });

  clearSavedBtn.addEventListener("click", () => {
    if (confirm("دڵنیایت لە سڕینەوەی زانیارییە هەڵگیراوەکان لەم ئامێرەدا؟")) {
      clearSavedData();
      resetAll(false);
      showStep(2);
    }
  });

  $("#notes").addEventListener("input", onFormChange);

  ["companyName", "contractNumber", "contractDate", "coordinationDate"].forEach((id) => {
    const el = $("#" + id);
    el.addEventListener("input", onFormChange);
    el.addEventListener("change", onFormChange);
  });

  function resetAll(clearStorage) {
    state.coordinationType = "";
    state.company = { name: "", contractNumber: "", contractDate: "", coordinationDate: "" };
    state.notes = "";
    coordinationTypeInput.value = "";
    $$(".type-choice").forEach((c) => c.classList.remove("selected"));
    typeError.hidden = true;
    companyForm.reset();
    $("#coordinationDate").value = todayISO();
    $("#notes").value = "";
    messagePreview.textContent = "";
    workersContainer.innerHTML = "";
    workerCount = 0;
    companyBanner.hidden = true;
    hideErrorSummary();
    $$(".field-error").forEach((el) => (el.textContent = ""));
    $$(".invalid").forEach((el) => el.classList.remove("invalid"));
    if (clearStorage) clearSavedData();
  }

  // --- Init ---
  $("#coordinationDate").value = todayISO();

  if (isLoggedIn()) {
    const hadDraft = !!localStorage.getItem(STORAGE_KEY);
    restoreDraft();
    if (!hadDraft) showStep(2);
  } else {
    showStep(1);
  }
})();
