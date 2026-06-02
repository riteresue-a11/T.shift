// =====================
// Firebase 設定
// =====================
const firebaseConfig = {
  apiKey: "AIzaSyAcm-D4KK0m0Q67rK4kiH8uMHlwBD5pU5Y",
  authDomain: "t-shift-35181.firebaseapp.com",
  projectId: "t-shift-35181",
  storageBucket: "t-shift-35181.firebasestorage.app",
  messagingSenderId: "692556391514",
  appId: "1:692556391514:web:75f17766dfd862dd0b2463",
  measurementId: "G-GG395PKGZF"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// =====================
// 定数
// =====================
const COLLECTIONS = {
  staffs: "staffs",
  applications: "applications",
  assignments: "assignments"
};

const DAY_NAMES = ["月", "火", "水", "木", "金", "土"];
const SHIFT_TYPES = ["early", "late"];
const SHIFT_LABELS = {
  early: "早番",
  late: "遅番"
};

const state = {
  currentUser: null,
  currentProfile: null,
  currentMode: "staff",
  weekInfo: null,
  approvedUsers: [],
  applications: [],
  assignments: []
};

// =====================
// DOM
// =====================
const el = {
  toast: document.getElementById("toast"),

  authScreen: document.getElementById("auth-screen"),
  pendingScreen: document.getElementById("pending-screen"),
  staffScreen: document.getElementById("staff-screen"),
  managerScreen: document.getElementById("manager-screen"),
  operatorScreen: document.getElementById("operator-screen"),

  showLoginTab: document.getElementById("show-login-tab"),
  showRegisterTab: document.getElementById("show-register-tab"),
  loginTab: document.getElementById("login-tab"),
  registerTab: document.getElementById("register-tab"),

  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginStaffBtn: document.getElementById("login-staff-btn"),
  loginManagerBtn: document.getElementById("login-manager-btn"),
  loginOperatorBtn: document.getElementById("login-operator-btn"),

  registerForm: document.getElementById("register-tab"),
  registerDisplayName: document.getElementById("register-display-name"),
  registerEmail: document.getElementById("register-email"),
  registerPassword: document.getElementById("register-password"),
  registerPasswordConfirm: document.getElementById("register-password-confirm"),

  pendingDisplayName: document.getElementById("pending-display-name"),
  pendingEmail: document.getElementById("pending-email"),
  pendingStatus: document.getElementById("pending-status"),

  staffWeekLabel: document.getElementById("staff-week-label"),
  staffFinalTable: document.getElementById("staff-final-table"),
  staffApplyList: document.getElementById("staff-apply-list"),

  staffAccountDisplayName: document.getElementById("staff-account-display-name"),
  staffAccountEmail: document.getElementById("staff-account-email"),
  openWithdrawBtn: document.getElementById("open-withdraw-btn"),
  withdrawConfirmBox: document.getElementById("withdraw-confirm-box"),
  withdrawPassword: document.getElementById("withdraw-password"),
  confirmWithdrawBtn: document.getElementById("confirm-withdraw-btn"),
  cancelWithdrawBtn: document.getElementById("cancel-withdraw-btn"),

  managerWeekLabel: document.getElementById("manager-week-label"),
  managerSummary: document.getElementById("manager-summary"),
  managerRecruitingList: document.getElementById("manager-recruiting-list"),
  submittedList: document.getElementById("submitted-list"),
  notSubmittedList: document.getElementById("not-submitted-list"),
  generateScheduleBtn: document.getElementById("generate-schedule-btn"),
  managerFinalEditTable: document.getElementById("manager-final-edit-table"),
  saveFinalEditBtn: document.getElementById("save-final-edit-btn"),

  operatorWeekLabel: document.getElementById("operator-week-label"),
  operatorRecruitingList: document.getElementById("operator-recruiting-list"),
  operatorFinalTable: document.getElementById("operator-final-table"),
  operatorAccountList: document.getElementById("operator-account-list")
};

// =====================
// 初期化
// =====================
bindEvents();
auth.onAuthStateChanged(handleAuthStateChanged);

// =====================
// イベント登録
// =====================
function bindEvents() {
  el.showLoginTab?.addEventListener("click", () => switchAuthTab("login"));
  el.showRegisterTab?.addEventListener("click", () => switchAuthTab("register"));

  el.loginStaffBtn?.addEventListener("click", () => loginUser("staff"));
  el.loginManagerBtn?.addEventListener("click", () => loginUser("manager"));
  el.loginOperatorBtn?.addEventListener("click", () => loginUser("operator"));

  el.registerForm?.addEventListener("submit", registerUser);

  document.querySelectorAll("[data-logout-button]").forEach((button) => {
    button.addEventListener("click", logoutUser);
  });

  document.querySelectorAll("[data-tab-group]").forEach((button) => {
    button.addEventListener("click", handleTabClick);
  });

  el.staffApplyList?.addEventListener("click", handleApplyButtonClick);

  el.openWithdrawBtn?.addEventListener("click", openWithdrawConfirm);
  el.cancelWithdrawBtn?.addEventListener("click", closeWithdrawConfirm);
  el.confirmWithdrawBtn?.addEventListener("click", withdrawOwnAccount);

  el.generateScheduleBtn?.addEventListener("click", generateSchedule);
  el.saveFinalEditBtn?.addEventListener("click", saveManualAssignments);
  el.operatorAccountList?.addEventListener("click", handleOperatorActionClick);
}

// =====================
// UI共通
// =====================
function showToast(message) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.toast.classList.add("hidden");
  }, 2400);
}

function clearRegisterForm() {
  el.registerDisplayName.value = "";
  el.registerEmail.value = "";
  el.registerPassword.value = "";
  el.registerPasswordConfirm.value = "";
}

function switchAuthTab(type) {
  const isLogin = type === "login";
  el.showLoginTab.classList.toggle("active", isLogin);
  el.showRegisterTab.classList.toggle("active", !isLogin);
  el.loginTab.classList.toggle("hidden", !isLogin);
  el.registerTab.classList.toggle("hidden", isLogin);
}

function showScreen(type) {
  const screens = {
    auth: el.authScreen,
    pending: el.pendingScreen,
    staff: el.staffScreen,
    manager: el.managerScreen,
    operator: el.operatorScreen
  };

  Object.values(screens).forEach((screen) => {
    screen?.classList.add("hidden");
  });

  screens[type]?.classList.remove("hidden");
}

function handleTabClick(event) {
  const button = event.currentTarget;
  const group = button.dataset.tabGroup;
  const target = button.dataset.tabTarget;

  document.querySelectorAll(`[data-tab-group="${group}"]`).forEach((tab) => {
    tab.classList.remove("active");
  });
  button.classList.add("active");

  if (group === "staff") {
    togglePanels(["staff-final-panel", "staff-apply-panel"], target);
  } else if (group === "manager") {
    togglePanels(["manager-recruiting-panel", "manager-final-panel"], target);
  } else if (group === "operator") {
    togglePanels(
      ["operator-recruiting-panel", "operator-final-panel", "operator-account-panel"],
      target
    );
  }
}

function togglePanels(panelIds, activeId) {
  panelIds.forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.classList.toggle("hidden", id !== activeId);
  });
}

// =====================
// 日付関連
// =====================
function buildWeekInfo() {
  const monday = getNextWeekMonday();
  const dates = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }

  return {
    key: formatDateKey(monday),
    monday,
    dates,
    label: `${formatMonthDay(dates[0])}(${DAY_NAMES[0]})〜${formatMonthDay(dates[5])}(${DAY_NAMES[5]})`
  };
}

function getNextWeekMonday() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = base.getDay(); // 0=Sun
  const diff = day === 0 ? 1 : 8 - day;
  base.setDate(base.getDate() + diff);
  return base;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildApplicationId(weekKey, dayIndex, shiftType, userId) {
  return `${weekKey}_${dayIndex}_${shiftType}_${userId}`;
}

function buildAssignmentId(weekKey, dayIndex, shiftType) {
  return `${weekKey}_${dayIndex}_${shiftType}`;
}

// =====================
// 認証
// =====================
async function registerUser(event) {
  event.preventDefault();

  const displayName = el.registerDisplayName.value.trim();
  const email = el.registerEmail.value.trim();
  const password = el.registerPassword.value;
  const passwordConfirm = el.registerPasswordConfirm.value;

  if (!displayName || !email || !password || !passwordConfirm) {
    showToast("登録項目を全部入力してください");
    return;
  }

  if (password.length < 6) {
    showToast("パスワードは6文字以上にしてください");
    return;
  }

  if (password !== passwordConfirm) {
    showToast("パスワード確認が一致しません");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName });

    await db.collection(COLLECTIONS.staffs).doc(userCredential.user.uid).set({
      uid: userCredential.user.uid,
      email,
      displayName,
      status: "pending",
      role: "staff",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    sessionStorage.setItem("loginMode", "staff");
    clearRegisterForm();
    showToast("登録できました。承認待ちです");
  } catch (error) {
    console.error(error);
    if (error.code === "auth/email-already-in-use") {
      showToast("そのメールアドレスはすでに使われています");
    } else {
      showToast("登録に失敗しました");
    }
  }
}

async function loginUser(mode) {
  const email = el.loginEmail.value.trim();
  const password = el.loginPassword.value;

  if (!email || !password) {
    showToast("メールアドレスとパスワードを入力してください");
    return;
  }

  try {
    sessionStorage.setItem("loginMode", mode);
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    console.error(error);
    showToast("ログインに失敗しました");
  }
}

async function logoutUser() {
  try {
    await auth.signOut();
    showToast("ログアウトしました");
  } catch (error) {
    console.error(error);
    showToast("ログアウトに失敗しました");
  }
}

async function handleAuthStateChanged(user) {
  if (!user) {
    state.currentUser = null;
    state.currentProfile = null;
    showScreen("auth");
    return;
  }

  try {
    state.currentUser = user;
    state.weekInfo = buildWeekInfo();

    const profile = await ensureUserProfile(user);
    state.currentProfile = profile;

    if (profile.status === "disabled") {
      showToast("このアカウントは停止中です");
      await auth.signOut();
      return;
    }

    if (profile.status !== "approved") {
      renderPendingScreen(profile);
      showScreen("pending");
      return;
    }

    const mode = sessionStorage.getItem("loginMode") || "staff";
    await enterMode(mode);
  } catch (error) {
    console.error(error);
    showToast("ログイン後の初期化に失敗しました");
    showScreen("auth");
  }
}

async function ensureUserProfile(user) {
  const ref = db.collection(COLLECTIONS.staffs).doc(user.uid);
  const snap = await ref.get();

  const fallbackDisplayName =
    user.displayName?.trim() ||
    (user.email ? user.email.split("@")[0] : "ユーザー");

  if (!snap.exists) {
    const newProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: fallbackDisplayName,
      status: "pending",
      role: "staff",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(newProfile, { merge: true });
    return newProfile;
  }

  const data = snap.data();
  const merged = {
    uid: user.uid,
    email: data.email || user.email || "",
    displayName: data.displayName || fallbackDisplayName,
    status: data.status || "pending",
    role: data.role || "staff"
  };

  if (!data.uid || !data.email || !data.displayName || !data.status || !data.role) {
    await ref.set(merged, { merge: true });
  }

  return merged;
}

function renderPendingScreen(profile) {
  el.pendingDisplayName.textContent = profile.displayName || "-";
  el.pendingEmail.textContent = profile.email || "-";
  el.pendingStatus.textContent = profile.status || "pending";
}

// =====================
// モード切替
// =====================
async function enterMode(mode) {
  state.currentMode = mode;
  sessionStorage.setItem("loginMode", mode);

  if (mode === "staff") {
    await loadStaffScreen();
    showScreen("staff");
    return;
  }

  if (mode === "manager") {
    await loadManagerScreen();
    showScreen("manager");
    return;
  }

  if (mode === "operator") {
    if (state.currentProfile.role !== "operator") {
      showToast("運営者権限がありません");
      sessionStorage.setItem("loginMode", "staff");
      await loadStaffScreen();
      showScreen("staff");
      return;
    }
    await loadOperatorScreen();
    showScreen("operator");
  }
}

// =====================
// Firestore取得
// =====================
async function fetchWeekApplications(weekKey) {
  const snap = await db.collection(COLLECTIONS.applications)
    .where("weekKey", "==", weekKey)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchWeekAssignments(weekKey) {
  const snap = await db.collection(COLLECTIONS.assignments)
    .where("weekKey", "==", weekKey)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchApprovedUsers() {
  const snap = await db.collection(COLLECTIONS.staffs)
    .where("status", "==", "approved")
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja"));
}

async function fetchAllAccounts() {
  const snap = await db.collection(COLLECTIONS.staffs).get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const orderA = accountStatusOrder(a.status);
      const orderB = accountStatusOrder(b.status);
      if (orderA !== orderB) return orderA - orderB;
      return (a.displayName || "").localeCompare(b.displayName || "", "ja");
    });
}

function accountStatusOrder(status) {
  if (status === "pending") return 0;
  if (status === "approved") return 1;
  if (status === "disabled") return 2;
  return 3;
}

// =====================
// 共通ロード
// =====================
async function loadCommonWeekData() {
  const weekKey = state.weekInfo.key;

  const [applications, assignments, approvedUsers] = await Promise.all([
    fetchWeekApplications(weekKey),
    fetchWeekAssignments(weekKey),
    fetchApprovedUsers()
  ]);

  state.applications = applications;
  state.assignments = assignments;
  state.approvedUsers = approvedUsers;
}

// =====================
// スタッフ画面
// =====================
async function loadStaffScreen() {
  await loadCommonWeekData();

  el.staffWeekLabel.textContent = `対象週 ${state.weekInfo.label}`;
  el.staffAccountDisplayName.textContent = state.currentProfile?.displayName || "-";
  el.staffAccountEmail.textContent = state.currentProfile?.email || "-";
  closeWithdrawConfirm();

  renderReadonlySchedule(el.staffFinalTable, state.assignments);
  renderStaffApplyList(state.applications);
}

function renderStaffApplyList(applications) {
  const myUid = state.currentUser.uid;

  el.staffApplyList.innerHTML = state.weekInfo.dates.map((date, dayIndex) => {
    return `
      <article class="day-card">
        <h3>${formatMonthDay(date)}（${DAY_NAMES[dayIndex]}）</h3>
        ${renderApplyRow("early", dayIndex, applications, myUid)}
        ${renderApplyRow("late", dayIndex, applications, myUid)}
      </article>
    `;
  }).join("");
}

function renderApplyRow(shiftType, dayIndex, applications, myUid) {
  const docId = buildApplicationId(state.weekInfo.key, dayIndex, shiftType, myUid);
  const exists = applications.some((app) => app.id === docId);
  const count = applications.filter((app) =>
    app.dayIndex === dayIndex && app.shiftType === shiftType
  ).length;

  return `
    <div class="shift-line">
      <div>
        <div class="shift-name">${SHIFT_LABELS[shiftType]}</div>
        <div class="muted">応募者 ${count}人</div>
      </div>
      <div class="shift-meta">
        <button
          class="apply-button ${exists ? "is-applied" : ""}"
          type="button"
          data-apply-day="${dayIndex}"
          data-apply-shift="${shiftType}"
        >
          ${exists ? "応募済み" : "応募する"}
        </button>
      </div>
    </div>
  `;
}

async function handleApplyButtonClick(event) {
  const button = event.target.closest("[data-apply-day]");
  if (!button) return;

  const dayIndex = Number(button.dataset.applyDay);
  const shiftType = button.dataset.applyShift;
  const weekKey = state.weekInfo.key;
  const user = state.currentUser;

  const docId = buildApplicationId(weekKey, dayIndex, shiftType, user.uid);
  const ref = db.collection(COLLECTIONS.applications).doc(docId);

  try {
    const snap = await ref.get();

    if (snap.exists) {
      await ref.delete();
      showToast("応募を取り消しました");
    } else {
      await ref.set({
        weekKey,
        dayIndex,
        shiftType,
        userId: user.uid,
        displayName: state.currentProfile.displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast("応募しました");
    }

    await loadStaffScreen();
  } catch (error) {
    console.error(error);
    showToast("応募処理に失敗しました");
  }
}

// =====================
// 管理者画面
// =====================
async function loadManagerScreen() {
  await loadCommonWeekData();

  el.managerWeekLabel.textContent = `対象週 ${state.weekInfo.label}`;
  renderManagerSummary();
  renderRecruitingList(el.managerRecruitingList, state.applications);
  renderSubmissionStatus();
  renderEditableSchedule(el.managerFinalEditTable, state.assignments);
}

function renderManagerSummary() {
  const approvedCount = state.approvedUsers.length;
  const submittedUserIds = new Set(state.applications.map((app) => app.userId));
  const submittedCount = submittedUserIds.size;
  const notSubmittedCount = Math.max(approvedCount - submittedCount, 0);
  const applicationCount = state.applications.length;

  el.managerSummary.innerHTML = `
    <div class="summary-card">
      <span>承認済みスタッフ</span>
      <strong>${approvedCount}</strong>
    </div>
    <div class="summary-card">
      <span>提出済み</span>
      <strong>${submittedCount}</strong>
    </div>
    <div class="summary-card">
      <span>未提出</span>
      <strong>${notSubmittedCount}</strong>
    </div>
    <div class="summary-card">
      <span>応募総数</span>
      <strong>${applicationCount}</strong>
    </div>
  `;
}

function renderSubmissionStatus() {
  const submittedIds = new Set(state.applications.map((app) => app.userId));

  const submittedUsers = state.approvedUsers.filter((user) => submittedIds.has(user.uid));
  const notSubmittedUsers = state.approvedUsers.filter((user) => !submittedIds.has(user.uid));

  el.submittedList.innerHTML = submittedUsers.length
    ? submittedUsers.map((user) => `<span class="chip">${escapeHtml(user.displayName || "未設定")}</span>`).join("")
    : `<span class="chip empty-chip">まだいません</span>`;

  el.notSubmittedList.innerHTML = notSubmittedUsers.length
    ? notSubmittedUsers.map((user) => `<span class="chip empty-chip">${escapeHtml(user.displayName || "未設定")}</span>`).join("")
    : `<span class="chip">全員提出済み</span>`;
}

function renderRecruitingList(container, applications) {
  container.innerHTML = state.weekInfo.dates.map((date, dayIndex) => {
    const earlyApplicants = applications
      .filter((app) => app.dayIndex === dayIndex && app.shiftType === "early")
      .map((app) => app.displayName);

    const lateApplicants = applications
      .filter((app) => app.dayIndex === dayIndex && app.shiftType === "late")
      .map((app) => app.displayName);

    return `
      <div class="recruiting-day">
        <h3>${formatMonthDay(date)}（${DAY_NAMES[dayIndex]}）</h3>

        <div class="recruiting-shift">
          <div class="recruiting-label">早番</div>
          <div class="chip-list">
            ${earlyApplicants.length
              ? earlyApplicants.map((name) => `<span class="chip">${escapeHtml(name)}</span>`).join("")
              : `<span class="chip empty-chip">応募なし</span>`}
          </div>
        </div>

        <div class="recruiting-shift">
          <div class="recruiting-label">遅番</div>
          <div class="chip-list">
            ${lateApplicants.length
              ? lateApplicants.map((name) => `<span class="chip">${escapeHtml(name)}</span>`).join("")
              : `<span class="chip empty-chip">応募なし</span>`}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderEditableSchedule(container, assignments) {
  const assignmentMap = createAssignmentMap(assignments);

  const headerCells = `
    <div class="cell header"></div>
    ${state.weekInfo.dates.map((date, index) => {
      return `<div class="cell header">${formatMonthDay(date)}<br>${DAY_NAMES[index]}</div>`;
    }).join("")}
  `;

  const rows = SHIFT_TYPES.map((shiftType) => {
    const cells = state.weekInfo.dates.map((_, dayIndex) => {
      const assignment = assignmentMap[`${dayIndex}_${shiftType}`];
      const value = assignment?.assignedDisplayName || "";
      return `
        <div class="cell input-cell">
          <input
            class="assignment-input"
            type="text"
            data-edit-day="${dayIndex}"
            data-edit-shift="${shiftType}"
            value="${escapeHtml(value)}"
            placeholder="名前を入力"
          />
        </div>
      `;
    }).join("");

    return `
      <div class="cell side">${SHIFT_LABELS[shiftType]}</div>
      ${cells}
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-wrap">
      <div class="schedule-grid">
        ${headerCells}
        ${rows}
      </div>
    </div>
  `;
}

async function saveManualAssignments() {
  try {
    const inputs = el.managerFinalEditTable.querySelectorAll("[data-edit-day]");
    const batch = db.batch();
    const approvedMap = Object.fromEntries(
      state.approvedUsers.map((user) => [normalizeName(user.displayName), user])
    );

    inputs.forEach((input) => {
      const dayIndex = Number(input.dataset.editDay);
      const shiftType = input.dataset.editShift;
      const name = input.value.trim();
      const docId = buildAssignmentId(state.weekInfo.key, dayIndex, shiftType);
      const ref = db.collection(COLLECTIONS.assignments).doc(docId);

      if (!name) {
        batch.delete(ref);
        return;
      }

      const matchedUser = approvedMap[normalizeName(name)] || null;

      batch.set(ref, {
        weekKey: state.weekInfo.key,
        dayIndex,
        shiftType,
        assignedUserId: matchedUser ? matchedUser.uid : null,
        assignedDisplayName: name,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: state.currentUser.uid,
        manual: true
      }, { merge: true });
    });

    await batch.commit();
    showToast("確定版を保存しました");
    await loadManagerScreen();
  } catch (error) {
    console.error(error);
    showToast("確定版の保存に失敗しました");
  }
}

async function generateSchedule() {
  try {
    await loadCommonWeekData();

    const existingMap = createAssignmentMap(state.assignments);
    const assignmentCounts = {};
    state.approvedUsers.forEach((user) => {
      assignmentCounts[user.uid] = 0;
    });

    state.assignments.forEach((assignment) => {
      if (assignment.assignedUserId) {
        assignmentCounts[assignment.assignedUserId] =
          (assignmentCounts[assignment.assignedUserId] || 0) + 1;
      }
    });

    const batch = db.batch();

    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      const chosenForDay = new Set();

      for (const shiftType of SHIFT_TYPES) {
        const existing = existingMap[`${dayIndex}_${shiftType}`];
        if (existing && existing.assignedDisplayName) {
          if (existing.assignedUserId) {
            chosenForDay.add(existing.assignedUserId);
          }
          continue;
        }

        const candidates = state.applications
          .filter((app) => app.dayIndex === dayIndex && app.shiftType === shiftType)
          .filter((app) => !chosenForDay.has(app.userId));

        if (!candidates.length) continue;

        const selected = pickFairCandidate(candidates, assignmentCounts);
        if (!selected) continue;

        const ref = db.collection(COLLECTIONS.assignments)
          .doc(buildAssignmentId(state.weekInfo.key, dayIndex, shiftType));

        batch.set(ref, {
          weekKey: state.weekInfo.key,
          dayIndex,
          shiftType,
          assignedUserId: selected.userId,
          assignedDisplayName: selected.displayName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: state.currentUser.uid,
          manual: false
        }, { merge: true });

        chosenForDay.add(selected.userId);
        assignmentCounts[selected.userId] = (assignmentCounts[selected.userId] || 0) + 1;
      }
    }

    await batch.commit();
    showToast("自動シフト作成を実行しました");
    await loadManagerScreen();
  } catch (error) {
    console.error(error);
    showToast("自動シフト作成に失敗しました");
  }
}

function pickFairCandidate(candidates, assignmentCounts) {
  if (!candidates.length) return null;

  let minCount = Infinity;
  candidates.forEach((candidate) => {
    const count = assignmentCounts[candidate.userId] || 0;
    if (count < minCount) minCount = count;
  });

  const leastAssigned = candidates.filter(
    (candidate) => (assignmentCounts[candidate.userId] || 0) === minCount
  );

  const randomIndex = Math.floor(Math.random() * leastAssigned.length);
  return leastAssigned[randomIndex];
}

// =====================
// 運営者画面
// =====================
async function loadOperatorScreen() {
  await loadCommonWeekData();

  el.operatorWeekLabel.textContent = `対象週 ${state.weekInfo.label}`;
  renderRecruitingList(el.operatorRecruitingList, state.applications);
  renderReadonlySchedule(el.operatorFinalTable, state.assignments);

  const accounts = await fetchAllAccounts();
  renderOperatorAccounts(accounts);
}

function renderOperatorAccounts(accounts) {
  el.operatorAccountList.innerHTML = accounts.map((account) => {
    const name = escapeHtml(account.displayName || "未設定");
    const email = escapeHtml(account.email || "");
    const status = account.status || "pending";
    const role = account.role || "staff";
    const isSelf = state.currentUser && account.uid === state.currentUser.uid;

    return `
      <div class="account-card">
        <div class="account-top">
          <div>
            <div class="account-name">${name}</div>
            <div class="account-email">${email}</div>
          </div>
        </div>

        <div class="account-badges">
          <span class="chip">${escapeHtml(status)}</span>
          <span class="chip">${escapeHtml(role)}</span>
        </div>

        <div class="account-actions">
          <button
            class="mini-button"
            type="button"
            data-account-action="approve"
            data-account-id="${account.uid}"
            ${status === "approved" ? "disabled" : ""}
          >
            承認
          </button>

          <button
            class="mini-button danger"
            type="button"
            data-account-action="disable"
            data-account-id="${account.uid}"
            ${status === "disabled" || isSelf ? "disabled" : ""}
          >
            停止
          </button>

          <button
            class="mini-button"
            type="button"
            data-account-action="reactivate"
            data-account-id="${account.uid}"
            ${status !== "disabled" ? "disabled" : ""}
          >
            再開
          </button>

          <button
            class="mini-button operator"
            type="button"
            data-account-action="toggle-role"
            data-account-id="${account.uid}"
            ${isSelf ? "disabled" : ""}
          >
            ${role === "operator" ? "staff化" : "運営者化"}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function handleOperatorActionClick(event) {
  const button = event.target.closest("[data-account-action]");
  if (!button) return;

  const action = button.dataset.accountAction;
  const uid = button.dataset.accountId;
  const ref = db.collection(COLLECTIONS.staffs).doc(uid);

  try {
    if (action === "approve") {
      await ref.set({ status: "approved" }, { merge: true });
      showToast("承認しました");
    } else if (action === "disable") {
      await ref.set({ status: "disabled" }, { merge: true });
      showToast("停止しました");
    } else if (action === "reactivate") {
      await ref.set({ status: "approved" }, { merge: true });
      showToast("再開しました");
    } else if (action === "toggle-role") {
      const snap = await ref.get();
      const data = snap.data() || {};
      const nextRole = data.role === "operator" ? "staff" : "operator";
      await ref.set({ role: nextRole }, { merge: true });
      showToast(`role を ${nextRole} に変更しました`);
    }

    await loadOperatorScreen();
  } catch (error) {
    console.error(error);
    showToast("アカウント操作に失敗しました");
  }
}

// =====================
// 表描画
// =====================
function createAssignmentMap(assignments) {
  const map = {};
  assignments.forEach((assignment) => {
    map[`${assignment.dayIndex}_${assignment.shiftType}`] = assignment;
  });
  return map;
}

function renderReadonlySchedule(container, assignments) {
  const assignmentMap = createAssignmentMap(assignments);

  const headerCells = `
    <div class="cell header"></div>
    ${state.weekInfo.dates.map((date, index) => {
      return `<div class="cell header">${formatMonthDay(date)}<br>${DAY_NAMES[index]}</div>`;
    }).join("")}
  `;

  const rows = SHIFT_TYPES.map((shiftType) => {
    const cells = state.weekInfo.dates.map((_, dayIndex) => {
      const assignment = assignmentMap[`${dayIndex}_${shiftType}`];
      const name = assignment?.assignedDisplayName || "未定";
      const emptyClass = assignment?.assignedDisplayName ? "" : "empty";
      return `<div class="cell ${emptyClass}">${escapeHtml(name)}</div>`;
    }).join("");

    return `
      <div class="cell side">${SHIFT_LABELS[shiftType]}</div>
      ${cells}
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-wrap">
      <div class="schedule-grid">
        ${headerCells}
        ${rows}
      </div>
    </div>
  `;
}

// =====================
// 補助
// =====================
function normalizeName(value) {
  return (value || "").trim().replace(/\s+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openWithdrawConfirm() {
  el.withdrawConfirmBox?.classList.remove("hidden");
  if (el.withdrawPassword) {
    el.withdrawPassword.value = "";
    el.withdrawPassword.focus();
  }
}

function closeWithdrawConfirm() {
  el.withdrawConfirmBox?.classList.add("hidden");
  if (el.withdrawPassword) {
    el.withdrawPassword.value = "";
  }
}

async function withdrawOwnAccount() {
  const user = auth.currentUser;
  const password = el.withdrawPassword?.value || "";

  if (!user) {
    showToast("ログイン状態を確認できませんでした");
    return;
  }

  if (!user.email) {
    showToast("メールアドレスを確認できませんでした");
    return;
  }

  if (!password.trim()) {
    showToast("パスワードを入力してください");
    return;
  }

  try {
    showToast("退会処理を開始します");

    // 1. 再認証
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      password
    );
    await user.reauthenticateWithCredential(credential);

    // 2. applications から本人の応募データを削除
    const applicationsSnap = await db
      .collection(COLLECTIONS.applications)
      .where("userId", "==", user.uid)
      .get();

    const applicationDocs = applicationsSnap.docs;
    const batchSize = 400;

    for (let i = 0; i < applicationDocs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = applicationDocs.slice(i, i + batchSize);

      chunk.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    }

    // 3. staffs から本人データを削除
    await db.collection(COLLECTIONS.staffs).doc(user.uid).delete();

    // 4. Authentication から本人アカウントを削除
    await user.delete();

    // 5. 後処理
    closeWithdrawConfirm();
    sessionStorage.removeItem("loginMode");
    showToast("退会が完了しました");
  } catch (error) {
    console.error(error);

    if (error.code === "auth/wrong-password") {
      showToast("パスワードが正しくありません");
      return;
    }

    if (error.code === "auth/too-many-requests") {
      showToast("試行回数が多すぎます。少し時間をおいてください");
      return;
    }

    if (error.code === "auth/requires-recent-login") {
      showToast("もう一度ログインしてから退会してください");
      return;
    }

    showToast("退会処理に失敗しました");
  }
}
