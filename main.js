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
const SHIFT_LABELS = {
  early: "早番",
  late: "遅番"
};

const state = {
  currentUser: null,
  currentProfile: null,
  currentMode: "staff",
  weekInfo: null,
  approvedUsers: []
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

function bindEvents() {
  el.showLoginTab.addEventListener("click", () => switchAuthTab("login"));
  el.showRegisterTab.addEventListener("click", () => switchAuthTab("register"));

  el.loginStaffBtn.addEventListener("click", () => loginUser("staff"));
  el.loginManagerBtn.addEventListener("click", () => loginUser("manager"));
  el.loginOperatorBtn.addEventListener("click", () => loginUser("operator"));

  el.registerForm.addEventListener("submit", registerUser);

  document.querySelectorAll("[data-logout-button]").forEach((button) => {
    button.addEventListener("click", logoutUser);
  });

  document.querySelectorAll("[data-tab-group]").forEach((button) => {
    button.addEventListener("click", handleTabClick);
  });

  el.staffApplyList.addEventListener("click", handleApplyButtonClick);
  el.generateScheduleBtn.addEventListener("click", generateSchedule);
  el.saveFinalEditBtn.addEventListener("click", saveManualAssignments);
  el.operatorAccountList.addEventListener("click", handleOperatorActionClick);
}

// =====================
// 認証タブ
// =====================
function switchAuthTab(type) {
  const loginActive = type === "login";
  el.showLoginTab.classList.toggle("active", loginActive);
  el.showRegisterTab.classList.toggle("active", !loginActive);
  el.loginTab.classList.toggle("hidden", !loginActive);
  el.registerTab.classList.toggle("hidden", loginActive);
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

    showToast("登録できました。承認待ちです");
    clearRegisterForm();
    sessionStorage.setItem("loginMode", "staff");
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

  if (!data.displayName || !data.email || !data.uid || !data.role || !data.status) {
    await ref.set(merged, { merge: true });
  }

  return merged;
}

// =====================
// 画面遷移
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
      showToast("運営者権限がありません。スタッフ画面を開きます");
      sessionStorage.setItem("loginMode", "staff");
      await loadStaffScreen();
      showScreen("staff");
      return;
    }
    await loadOperatorScreen();
    showScreen("operator");
  }
}

function showScreen(type) {
  const map = {
    auth: el.authScreen,
    pending: el.pendingScreen,
    staff: el.staffScreen,
    manager: el.managerScreen,
    operator: el.operatorScreen
  };

  Object.values(map).forEach((screen) => screen.classList.add("hidden"));
  map[type].classList.remove("hidden");
}

function renderPendingScreen(profile) {
  el.pendingDisplayName.textContent = profile.displayName || "-";
  el.pendingEmail.textContent = profile.email || "-";
  el.pendingStatus.textContent = profile.status || "pending";
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
  }
  if (group === "manager") {
    togglePanels(["manager-recruiting-panel", "manager-final-panel"], target);
  }
  if (group === "operator") {
    togglePanels(["operator-recruiting-panel", "operator-final-panel", "operator-account-panel"], target);
  }
}

function togglePanels(panelIds, activeId) {
  panelIds.forEach((id) => {
    const node = document.getElementById(id);
    node.classList.toggle("hidden", id !== activeId);
  });
}

// =====================
// 日付
// =====================
function buildWeekInfo() {
  const monday = getNextWeekMonday();
  const dates = [];

  for (let i = 0; i < 6; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
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
  const day = base.getDay();
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

// =====================
// データ取得
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

  const users = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  users.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja"));
  return users;
}

async function fetchAllAccounts() {
  const snap = await db.collection(COLLECTIONS.staffs).get();
  const accounts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  accounts.sort((a, b) => {
    const orderA = accountStatusOrder(a.status);
    const orderB = accountStatusOrder(b.status);
    if (orderA !== orderB) return orderA - orderB;
    return (a.displayName || "").localeCompare(b.displayName || "", "ja");
  });
  return accounts;
}

function accountStatusOrder(status) {
  if (status === "pending") return 0;
  if (status === "approved") return 1;
  return 2;
}

// =====================
// スタッフ画面
// =====================
async function loadStaffScreen() {
  const weekKey = state.weekInfo.key;
  const [applications, assignments] = await Promise.all([
    fetchWeekApplications(weekKey),
    fetchWeekAssignments(weekKey)
  ]);

  el.staffWeekLabel.textContent = `対象週 ${state.weekInfo.label}`;
  renderReadonlySchedule(el.staffFinalTable, assignments);
  renderStaffApplyList(applications);
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
  const applicantCount = applications.filter((app) =>
    app.dayIndex === dayIndex && app.shiftType === shiftType
  ).length;

  return `
    <div class="shift-line">
      <div>
        <div class="shift-name">${SHIFT_LABELS[shiftType]}</div>
        <div class="muted">応募者 ${applicantCount}人</div>
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
  const snap = await ref.get();

  try {
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