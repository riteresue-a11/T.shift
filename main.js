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
  assignments: "assignments",
  systemMeta: "system_meta",
};


const DAY_NAMES = ["月", "火", "水", "木", "金", "土"];
const SHIFT_TYPES = ["early", "late"];
const SHIFT_LABELS = {
  early: "早番",
  late: "遅番"
};

const SHIFT_TIME_LABELS = {
  early: "17:00〜",
  late: "19:00〜"
};

const CELL_EDIT_ORDER = [null, "early", "late", "blank"];

const state = {
  currentUser: null,
  currentProfile: null,
  currentMode: "staff",
  weekInfo: null,
  approvedUsers: [],
  applications: [],
  draftAssignments: [],
  publishedAssignments: [],
  shiftState: {
    currentPublishedWeekKey: null,
    backupPublishedWeekKey: null
  }
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
  staffApplyWeekLabel: document.getElementById("staff-apply-week-label"),
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
  managerDraftWeekLabel: document.getElementById("manager-draft-week-label"),
  managerPublishedWeekLabel: document.getElementById("manager-published-week-label"),
  managerSummary: document.getElementById("manager-summary"),
  managerRecruitingList: document.getElementById("manager-recruiting-list"),
  submittedList: document.getElementById("submitted-list"),
  notSubmittedList: document.getElementById("not-submitted-list"),
  generateScheduleBtn: document.getElementById("generate-schedule-btn"),
  managerFinalEditTable: document.getElementById("manager-final-edit-table"),
  saveFinalEditBtn: document.getElementById("save-final-edit-btn"),
  publishDraftBtn: document.getElementById("publish-draft-btn"),
  unpublishBtn: document.getElementById("unpublish-btn"),
  managerPublishedTable: document.getElementById("manager-published-table"),

  operatorWeekLabel: document.getElementById("operator-week-label"),
  operatorPublishedWeekLabel: document.getElementById("operator-published-week-label"),
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
  el.publishDraftBtn?.addEventListener("click", publishDraftAssignments);
  el.unpublishBtn?.addEventListener("click", unpublishCurrentPublished);

  el.managerFinalEditTable?.addEventListener("click", handleDraftCellClick);
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
    togglePanels(["staff-final-panel", "staff-apply-panel", "staff-account-panel"], target);
  } else if (group === "manager") {
    togglePanels(
      ["manager-recruiting-panel", "manager-final-panel", "manager-published-panel"],
      target
    );
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

function buildAssignmentId(weekKey, userId, dayIndex) {
  return `${weekKey}_${userId}_${dayIndex}`;
}

async function runWeeklyCleanupIfNeeded() {
  if (!state.weekInfo?.key) return;

  const cleanupRef = db.collection(COLLECTIONS.systemMeta).doc("cleanup");
  const cleanupSnap = await cleanupRef.get();

  const currentWeekKey = state.weekInfo.key;
  const previousWeekKey = getPreviousWeekKey(currentWeekKey);

  const lastCleanupWeekKey = cleanupSnap.exists
    ? cleanupSnap.data().lastCleanupWeekKey
    : null;

  if (lastCleanupWeekKey === currentWeekKey) {
    return;
  }

  await deleteOldWeekDocs(COLLECTIONS.applications, currentWeekKey);
  await deleteOldWeekDocs(COLLECTIONS.assignments, previousWeekKey);

  await cleanupRef.set(
    {
      lastCleanupWeekKey: currentWeekKey,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function deleteOldWeekDocs(collectionName, cutoffWeekKey) {
  const batchSize = 400;

  while (true) {
    const snap = await db
      .collection(collectionName)
      .where("weekKey", "<", cutoffWeekKey)
      .limit(batchSize)
      .get();

    if (snap.empty) {
      break;
    }

    const batch = db.batch();

    snap.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    if (snap.size < batchSize) {
      break;
    }
  }
}

function getPreviousWeekKey(weekKey) {
  const date = new Date(`${weekKey}T00:00:00`);
  date.setDate(date.getDate() - 7);
  return formatDateKey(date);
}


// =====================
// 認証
// =====================
async function getNextDisplayOrder() {
  const snap = await db.collection(COLLECTIONS.staffs).get();
  let maxOrder = 0;

  snap.forEach((doc) => {
    const value = Number(doc.data().displayOrder) || 0;
    if (value > maxOrder) {
      maxOrder = value;
    }
  });

  return maxOrder + 1;
}

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

    const displayOrder = await getNextDisplayOrder();

    await db.collection(COLLECTIONS.staffs).doc(userCredential.user.uid).set({
      uid: userCredential.user.uid,
      email,
      displayName,
      status: "approved",
      role: "staff",
      displayOrder,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    sessionStorage.setItem("loginMode", "staff");
    clearRegisterForm();
    showToast("登録できました。ログインできます");
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

  const registerInputDisplayName = el.registerDisplayName?.value.trim() || "";
  const fallbackDisplayName =
    user.displayName?.trim() ||
    registerInputDisplayName ||
    (user.email ? user.email.split("@")[0] : "ユーザー");

  if (!snap.exists) {
  const newProfile = {
    uid: user.uid,
    email: user.email || "",
    displayName: fallbackDisplayName,
    status: "approved",
    role: "staff",
    displayOrder: 9999,
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
    status: data.status || "approved",
    role: data.role || "staff",
    displayOrder: Number(data.displayOrder) || 9999
  };

  if (
    !data.uid ||
    !data.email ||
    !data.displayName ||
    !data.status ||
    !data.role ||
    !data.displayOrder
  ) {
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
function buildWeekInfoFromWeekKey(weekKey) {
  if (!weekKey) return null;

  const monday = new Date(`${weekKey}T00:00:00`);
  const dates = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }

  return {
    key: weekKey,
    monday,
    dates,
    label: `${formatMonthDay(dates[0])}(${DAY_NAMES[0]})〜${formatMonthDay(dates[5])}(${DAY_NAMES[5]})`
  };
}

async function fetchWeekApplications(weekKey) {
  const snap = await db.collection(COLLECTIONS.applications)
    .where("weekKey", "==", weekKey)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchAssignmentsByStatus(weekKey, status) {
  if (!weekKey) return [];

  const snap = await db.collection(COLLECTIONS.assignments)
    .where("weekKey", "==", weekKey)
    .where("status", "==", status)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchLegacyWeekAssignments(weekKey) {
  if (!weekKey) return [];

  const snap = await db.collection(COLLECTIONS.assignments)
    .where("weekKey", "==", weekKey)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function convertLegacyAssignmentsToCells(assignments) {
  return assignments
    .filter((item) => item.assignedUserId && item.shiftType)
    .map((item) => ({
      id: `legacy_${item.weekKey}_${item.assignedUserId}_${item.dayIndex}`,
      weekKey: item.weekKey,
      userId: item.assignedUserId,
      dayIndex: item.dayIndex,
      assignedShiftType: item.shiftType,
      assignedDisplayName: item.assignedDisplayName || "",
      displayOrder: 9999,
      status: "published"
    }));
}

async function fetchShiftState() {
  const snap = await db.collection(COLLECTIONS.systemMeta).doc("shift_state").get();

  if (!snap.exists) {
    return {
      currentPublishedWeekKey: null,
      backupPublishedWeekKey: null
    };
  }

  const data = snap.data() || {};
  return {
    currentPublishedWeekKey: data.currentPublishedWeekKey || null,
    backupPublishedWeekKey: data.backupPublishedWeekKey || null
  };
}

async function saveShiftState(nextState) {
  await db.collection(COLLECTIONS.systemMeta).doc("shift_state").set(
    {
      currentPublishedWeekKey: nextState.currentPublishedWeekKey || null,
      backupPublishedWeekKey: nextState.backupPublishedWeekKey || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function fetchApprovedUsers() {
  const snap = await db.collection(COLLECTIONS.staffs)
    .where("status", "==", "approved")
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const orderA = Number(a.displayOrder) || 9999;
      const orderB = Number(b.displayOrder) || 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.displayName || "").localeCompare(b.displayName || "", "ja");
    });
}

async function fetchAllAccounts() {
  const snap = await db.collection(COLLECTIONS.staffs).get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const orderA = Number(a.displayOrder) || 9999;
      const orderB = Number(b.displayOrder) || 9999;
      if (orderA !== orderB) return orderA - orderB;

      const statusA = accountStatusOrder(a.status);
      const statusB = accountStatusOrder(b.status);
      if (statusA !== statusB) return statusA - statusB;

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
  state.weekInfo = buildWeekInfo();
  await runWeeklyCleanupIfNeeded();

  const recruitWeekKey = state.weekInfo.key;

  const [applications, draftAssignments, approvedUsers, shiftState] = await Promise.all([
    fetchWeekApplications(recruitWeekKey),
    fetchAssignmentsByStatus(recruitWeekKey, "draft"),
    fetchApprovedUsers(),
    fetchShiftState()
  ]);

  let publishedAssignments = [];

  if (shiftState.currentPublishedWeekKey) {
    publishedAssignments = await fetchAssignmentsByStatus(
      shiftState.currentPublishedWeekKey,
      "published"
    );
  } else {
    const fallbackWeekKey = getPreviousWeekKey(recruitWeekKey);
    const legacyAssignments = await fetchLegacyWeekAssignments(fallbackWeekKey);
    publishedAssignments = convertLegacyAssignmentsToCells(legacyAssignments);

    if (publishedAssignments.length) {
      shiftState.currentPublishedWeekKey = fallbackWeekKey;
    }
  }

  state.applications = applications;
  state.draftAssignments = draftAssignments;
  state.publishedAssignments = publishedAssignments;
  state.approvedUsers = approvedUsers;
  state.shiftState = shiftState;
}

function getCurrentPublishedWeekInfo() {
  if (!state.shiftState?.currentPublishedWeekKey) return null;
  return buildWeekInfoFromWeekKey(state.shiftState.currentPublishedWeekKey);
}

// =====================
// スタッフ画面
// =====================
async function loadStaffScreen() {
  await loadCommonWeekData();

  const publishedWeekInfo = getCurrentPublishedWeekInfo();

  el.staffWeekLabel.textContent = publishedWeekInfo
    ? `公開週 ${publishedWeekInfo.label}`
    : "公開週 -";

  el.staffApplyWeekLabel.textContent = `募集週 ${state.weekInfo.label}`;
  el.staffAccountDisplayName.textContent = state.currentProfile?.displayName || "-";
  el.staffAccountEmail.textContent = state.currentProfile?.email || "-";
  closeWithdrawConfirm();

  renderReadonlySchedule(
    el.staffFinalTable,
    publishedWeekInfo,
    state.approvedUsers,
    state.publishedAssignments
  );

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
        displayOrder: Number(state.currentProfile.displayOrder) || 9999,
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

  const publishedWeekInfo = getCurrentPublishedWeekInfo();

  el.managerWeekLabel.textContent = `募集週 ${state.weekInfo.label}`;
  el.managerDraftWeekLabel.textContent = `作成対象週 ${state.weekInfo.label}`;
  el.managerPublishedWeekLabel.textContent = publishedWeekInfo
    ? `公開中週 ${publishedWeekInfo.label}`
    : "公開中週 -";

  renderManagerSummary();
  renderRecruitingList(el.managerRecruitingList, state.applications);
  renderSubmissionStatus();

  renderEditableSchedule(
    el.managerFinalEditTable,
    state.weekInfo,
    state.approvedUsers,
    state.draftAssignments
  );

  renderReadonlySchedule(
    el.managerPublishedTable,
    publishedWeekInfo,
    state.approvedUsers,
    state.publishedAssignments
  );
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
      .sort(compareApplicants)
      .map((app) => app.displayName);

    const lateApplicants = applications
      .filter((app) => app.dayIndex === dayIndex && app.shiftType === "late")
      .sort(compareApplicants)
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

function compareApplicants(a, b) {
  const orderA = Number(a.displayOrder) || 9999;
  const orderB = Number(b.displayOrder) || 9999;
  if (orderA !== orderB) return orderA - orderB;
  return (a.displayName || "").localeCompare(b.displayName || "", "ja");
}

async function saveManualAssignments() {
  try {
    const buttons = el.managerFinalEditTable.querySelectorAll("[data-edit-user][data-edit-day]");
    const batch = db.batch();
    const weekKey = state.weekInfo.key;
    const userMap = Object.fromEntries(state.approvedUsers.map((user) => [user.uid, user]));

    buttons.forEach((button) => {
      const userId = button.dataset.editUser;
      const dayIndex = Number(button.dataset.editDay);
      const cellValueRaw = button.dataset.cellValue || "x";
      const cellValue = cellValueRaw === "x" ? null : cellValueRaw;

      const ref = db.collection(COLLECTIONS.assignments).doc(
        buildAssignmentId(weekKey, userId, dayIndex)
      );

      if (!cellValue) {
        batch.delete(ref);
        return;
      }

      const user = userMap[userId];
      if (!user) return;

      batch.set(ref, {
        weekKey,
        userId,
        dayIndex,
        assignedShiftType: cellValue,
        assignedDisplayName: user.displayName || "",
        displayOrder: Number(user.displayOrder) || 9999,
        status: "draft",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: state.currentUser.uid
      }, { merge: true });
    });

    await batch.commit();
    showToast("作成中シフトを保存しました");
    await loadManagerScreen();
  } catch (error) {
    console.error(error);
    showToast("作成中シフトの保存に失敗しました");
  }
}

async function clearDraftAssignmentsForWeek(weekKey) {
  const snap = await db.collection(COLLECTIONS.assignments)
    .where("weekKey", "==", weekKey)
    .where("status", "==", "draft")
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function clearBackupAssignments() {
  const snap = await db.collection(COLLECTIONS.assignments)
    .where("status", "==", "backup")
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function generateSchedule() {
  try {
    await loadCommonWeekData();

    const weekKey = state.weekInfo.key;
    const assignmentCounts = {};
    state.approvedUsers.forEach((user) => {
      assignmentCounts[user.uid] = 0;
    });

    const selectedMap = {};
    const appliedByUserDay = {};

    state.applications.forEach((app) => {
      const key = `${app.userId}_${app.dayIndex}`;
      if (!appliedByUserDay[key]) {
        appliedByUserDay[key] = {
          userId: app.userId,
          dayIndex: app.dayIndex,
          displayName: app.displayName || "",
          displayOrder: Number(app.displayOrder) || 9999,
          shiftTypes: []
        };
      }
      appliedByUserDay[key].shiftTypes.push(app.shiftType);
    });

    for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
      const chosenForDay = new Set();

      for (const shiftType of SHIFT_TYPES) {
        const candidates = state.applications
          .filter((app) => app.dayIndex === dayIndex && app.shiftType === shiftType)
          .filter((app) => !chosenForDay.has(app.userId));

        if (!candidates.length) continue;

        const selected = pickFairCandidate(candidates, assignmentCounts);
        if (!selected) continue;

        selectedMap[`${selected.userId}_${dayIndex}`] = {
          userId: selected.userId,
          dayIndex,
          assignedShiftType: shiftType,
          assignedDisplayName: selected.displayName,
          displayOrder: Number(selected.displayOrder) || 9999
        };

        chosenForDay.add(selected.userId);
        assignmentCounts[selected.userId] = (assignmentCounts[selected.userId] || 0) + 1;
      }
    }

    await clearDraftAssignmentsForWeek(weekKey);

    const batch = db.batch();

    Object.values(appliedByUserDay).forEach((item) => {
      const selected = selectedMap[`${item.userId}_${item.dayIndex}`];
      const assignedShiftType = selected ? selected.assignedShiftType : "blank";

      const ref = db.collection(COLLECTIONS.assignments).doc(
        buildAssignmentId(weekKey, item.userId, item.dayIndex)
      );

      batch.set(ref, {
        weekKey,
        userId: item.userId,
        dayIndex: item.dayIndex,
        assignedShiftType,
        assignedDisplayName: item.displayName,
        displayOrder: item.displayOrder,
        status: "draft",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: state.currentUser.uid,
        manual: false
      }, { merge: true });
    });

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

async function publishDraftAssignments() {
  try {
    const weekKey = state.weekInfo.key;
    const draftAssignments = await fetchAssignmentsByStatus(weekKey, "draft");

    if (!draftAssignments.length) {
      showToast("公開する作成中シフトがありません");
      return;
    }

    await clearBackupAssignments();

    const batch = db.batch();

    if (state.shiftState.currentPublishedWeekKey) {
      const currentPublished = await fetchAssignmentsByStatus(
        state.shiftState.currentPublishedWeekKey,
        "published"
      );

      currentPublished.forEach((item) => {
        const ref = db.collection(COLLECTIONS.assignments).doc(item.id);
        batch.set(ref, { status: "backup" }, { merge: true });
      });
    }

    draftAssignments.forEach((item) => {
      const ref = db.collection(COLLECTIONS.assignments).doc(item.id);
      batch.set(ref, {
        status: "published",
        publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
        publishedBy: state.currentUser.uid
      }, { merge: true });
    });

    await batch.commit();

    await saveShiftState({
      currentPublishedWeekKey: weekKey,
      backupPublishedWeekKey: state.shiftState.currentPublishedWeekKey || null
    });

    showToast("作成中シフトを公開しました");
    await loadManagerScreen();
  } catch (error) {
    console.error(error);
    showToast("公開に失敗しました");
  }
}

async function unpublishCurrentPublished() {
  try {
    const currentWeekKey = state.shiftState.currentPublishedWeekKey;
    const backupWeekKey = state.shiftState.backupPublishedWeekKey;

    if (!currentWeekKey || currentWeekKey !== state.weekInfo.key) {
      showToast("取り消せる公開中シフトがありません");
      return;
    }

    if (!backupWeekKey) {
      showToast("戻す前の公開済みシフトがありません");
      return;
    }

    const [currentPublished, backupAssignments] = await Promise.all([
      fetchAssignmentsByStatus(currentWeekKey, "published"),
      fetchAssignmentsByStatus(backupWeekKey, "backup")
    ]);

    const batch = db.batch();

    currentPublished.forEach((item) => {
      const ref = db.collection(COLLECTIONS.assignments).doc(item.id);
      batch.set(ref, { status: "draft" }, { merge: true });
    });

    backupAssignments.forEach((item) => {
      const ref = db.collection(COLLECTIONS.assignments).doc(item.id);
      batch.set(ref, { status: "published" }, { merge: true });
    });

    await batch.commit();

    await saveShiftState({
      currentPublishedWeekKey: backupWeekKey,
      backupPublishedWeekKey: null
    });

    showToast("公開を取り消しました");
    await loadManagerScreen();
  } catch (error) {
    console.error(error);
    showToast("公開取り消しに失敗しました");
  }
}


// =====================
// 運営者画面
// =====================
async function loadOperatorScreen() {
  await loadCommonWeekData();

  const publishedWeekInfo = getCurrentPublishedWeekInfo();

  el.operatorWeekLabel.textContent = `募集週 ${state.weekInfo.label}`;
  el.operatorPublishedWeekLabel.textContent = publishedWeekInfo
    ? `公開中週 ${publishedWeekInfo.label}`
    : "公開中週 -";

  renderRecruitingList(el.operatorRecruitingList, state.applications);

  renderReadonlySchedule(
    el.operatorFinalTable,
    publishedWeekInfo,
    state.approvedUsers,
    state.publishedAssignments
  );

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
    const displayOrder = Number(account.displayOrder) || 9999;

    return `
      <div class="account-card">
        <div class="account-top">
          <div>
            <div class="account-name">${name}</div>
            <div class="account-email">${email}</div>
          </div>
        </div>

        <div class="account-badges">
          <span class="chip">順番 ${displayOrder}</span>
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
    map[`${assignment.userId}_${assignment.dayIndex}`] = assignment;
  });
  return map;
}

function getCellVisual(cellValue) {
  if (cellValue === "early" || cellValue === "late") {
    return {
      text: SHIFT_TIME_LABELS[cellValue],
      className: "time-cell"
    };
  }

  if (cellValue === "blank") {
    return {
      text: "",
      className: "blank-cell"
    };
  }

  return {
    text: "×",
    className: "x-cell"
  };
}

function renderReadonlySchedule(container, weekInfo, users, assignments) {
  if (!container) return;

  if (!weekInfo) {
    container.innerHTML = `<p class="muted">公開中シフトはまだありません。</p>`;
    return;
  }

  const assignmentMap = createAssignmentMap(assignments);

  const headCells = weekInfo.dates.map((date, index) => {
    return `<th>${formatMonthDay(date)}<br>${DAY_NAMES[index]}</th>`;
  }).join("");

  const rows = users.map((user) => {
    const cells = weekInfo.dates.map((_, dayIndex) => {
      const assignment = assignmentMap[`${user.uid}_${dayIndex}`];
      const cellValue = assignment?.assignedShiftType || null;
      const visual = getCellVisual(cellValue);
      const textHtml = visual.text ? escapeHtml(visual.text) : "&nbsp;";

      return `<td class="${visual.className}">${textHtml}</td>`;
    }).join("");

    return `
      <tr>
        <th>${escapeHtml(user.displayName || "未設定")}</th>
        ${cells}
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th></th>
            ${headCells}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderEditableSchedule(container, weekInfo, users, assignments) {
  if (!container) return;

  const assignmentMap = createAssignmentMap(assignments);

  const headCells = weekInfo.dates.map((date, index) => {
    return `<th>${formatMonthDay(date)}<br>${DAY_NAMES[index]}</th>`;
  }).join("");

  const rows = users.map((user) => {
    const cells = weekInfo.dates.map((_, dayIndex) => {
      const assignment = assignmentMap[`${user.uid}_${dayIndex}`];
      const cellValue = assignment?.assignedShiftType || null;
      const visual = getCellVisual(cellValue);
      const textHtml = visual.text ? escapeHtml(visual.text) : "&nbsp;";

      return `
        <td>
          <button
            type="button"
            class="draft-cell-button ${visual.className}"
            data-edit-user="${user.uid}"
            data-edit-day="${dayIndex}"
            data-cell-value="${cellValue ?? "x"}"
          >
            ${textHtml}
          </button>
        </td>
      `;
    }).join("");

    return `
      <tr>
        <th>${escapeHtml(user.displayName || "未設定")}</th>
        ${cells}
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="matrix-table editable-table">
        <thead>
          <tr>
            <th></th>
            ${headCells}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function getNextCellEditValue(currentValue) {
  const current = currentValue === "x" ? null : currentValue;
  const currentIndex = CELL_EDIT_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % CELL_EDIT_ORDER.length;
  return CELL_EDIT_ORDER[nextIndex];
}

function handleDraftCellClick(event) {
  const button = event.target.closest("[data-edit-user][data-edit-day]");
  if (!button) return;

  const currentValue = button.dataset.cellValue || "x";
  const nextValue = getNextCellEditValue(currentValue);
  const visual = getCellVisual(nextValue);

  button.dataset.cellValue = nextValue ?? "x";
  button.className = `draft-cell-button ${visual.className}`;
  button.innerHTML = visual.text ? escapeHtml(visual.text) : "&nbsp;";
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
