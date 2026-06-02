// ================================
// Firebase 設定
// apiKey 以外は Firebase Console の Web アプリ設定から埋めてください
// ================================
const firebaseConfig = {
  apiKey: "AIzaSyAcm-D4KK0m0Q67rK4kiH8uMHlwBD5pU5Y",
  authDomain: "t-shift-35181.firebaseapp.com",
  projectId: "t-shift-35181",
  storageBucket: "t-shift-35181.firebasestorage.app",
  messagingSenderId: "692556391514",
  appId: "1:692556391514:web:75f17766dfd862dd0b2463"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const SHIFT_TYPES = [
  { key: "early", label: "早番" },
  { key: "late", label: "遅番" }
];

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土"];

const state = {
  currentUser: null,
  profile: null,
  targetWeek: null,
  applications: [],
  assignments: [],
  approvedUsers: [],
  pendingUsers: []
};

const els = {
  toast: document.getElementById("toast"),

  authScreen: document.getElementById("auth-screen"),
  pendingScreen: document.getElementById("pending-screen"),
  staffScreen: document.getElementById("staff-screen"),
  managerScreen: document.getElementById("manager-screen"),

  showLoginTabBtn: document.getElementById("show-login-tab"),
  showRegisterTabBtn: document.getElementById("show-register-tab"),
  loginTab: document.getElementById("login-tab"),
  registerTab: document.getElementById("register-tab"),

  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),

  pendingUserText: document.getElementById("pending-user-text"),
  pendingLogoutBtn: document.getElementById("pending-logout-btn"),

  staffLogoutBtn: document.getElementById("staff-logout-btn"),
  managerLogoutBtn: document.getElementById("manager-logout-btn"),

  staffHeaderMeta: document.getElementById("staff-header-meta"),
  staffFinalWeekLabel: document.getElementById("staff-final-week-label"),
  staffApplyWeekLabel: document.getElementById("staff-apply-week-label"),
  staffSubmissionCount: document.getElementById("staff-submission-count"),
  staffFinalTable: document.getElementById("staff-final-table"),
  staffApplyList: document.getElementById("staff-apply-list"),

  managerHeaderMeta: document.getElementById("manager-header-meta"),
  managerRecruitingWeekLabel: document.getElementById("manager-recruiting-week-label"),
  managerFinalWeekLabel: document.getElementById("manager-final-week-label"),
  managerRecruitingList: document.getElementById("manager-recruiting-list"),
  managerFinalTable: document.getElementById("manager-final-table"),
  pendingUserList: document.getElementById("pending-user-list"),

  approvedCount: document.getElementById("approved-count"),
  submittedCount: document.getElementById("submitted-count"),
  notSubmittedCount: document.getElementById("not-submitted-count"),
  applicationCount: document.getElementById("application-count"),

  submittedUserList: document.getElementById("submitted-user-list"),
  notSubmittedUserList: document.getElementById("not-submitted-user-list"),

  generateScheduleBtn: document.getElementById("generate-schedule-btn"),
  saveFinalBtn: document.getElementById("save-final-btn")
};

// ================================
// 共通
// ================================
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2500);
}

function showOnlyScreen(screenEl) {
  [els.authScreen, els.pendingScreen, els.staffScreen, els.managerScreen].forEach((el) => {
    el.classList.add("hidden");
  });
  screenEl.classList.remove("hidden");
}

function switchTab(buttons, panels, targetId) {
  buttons.forEach((btn) => btn.classList.remove("active"));
  panels.forEach((panel) => panel.classList.add("hidden"));

  const activeBtn = [...buttons].find((btn) => btn.dataset.target === targetId);
  const activePanel = document.getElementById(targetId);

  if (activeBtn) activeBtn.classList.add("active");
  if (activePanel) activePanel.classList.remove("hidden");
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getJSTNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function getNextWeekInfo() {
  const now = getJSTNow();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const day = today.getDay(); // 0=Sun ... 6=Sat
  const diffToThisMonday = day === 0 ? -6 : 1 - day;

  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + diffToThisMonday);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);

  const dates = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i);
    dates.push(d);
  }

  return {
    weekKey: formatDateKey(nextMonday),
    monday: nextMonday,
    dates,
    label: `${formatMonthDay(dates[0])}(${WEEKDAY_LABELS[0]})〜${formatMonthDay(dates[5])}(${WEEKDAY_LABELS[5]})`
  };
}

function getCellDocId(weekKey, dateKey, shiftType) {
  return `${weekKey}_${dateKey}_${shiftType}`;
}

function getAssignmentMap(assignments) {
  const map = {};
  assignments.forEach((item) => {
    map[`${item.dateKey}_${item.shiftType}`] = item;
  });
  return map;
}

function getApplicationsMap(applications) {
  const map = {};
  applications.forEach((item) => {
    const key = `${item.dateKey}_${item.shiftType}`;
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });
  return map;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeName(value) {
  return String(value || "").trim().slice(0, 20);
}

// ================================
// 認証
// ================================
async function registerUser(event) {
  event.preventDefault();

  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const passwordConfirm = document.getElementById("register-password-confirm").value;
  const displayName = normalizeName(document.getElementById("register-display-name").value);

  if (!email || !password || !passwordConfirm || !displayName) {
    showToast("すべて入力してください");
    return;
  }

  if (password !== passwordConfirm) {
    showToast("パスワードが一致しません");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName });

    await db.collection("staffs").doc(userCredential.user.uid).set({
      uid: userCredential.user.uid,
      email,
      displayName,
      role: "staff",
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast("登録しました。管理者の承認待ちです");
    event.target.reset();
  } catch (error) {
    console.error(error);
    showToast("登録に失敗しました");
  }
}

async function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showToast("メールアドレスとパスワードを入力してください");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    event.target.reset();
  } catch (error) {
    console.error(error);
    showToast("ログインに失敗しました");
  }
}

async function logoutUser() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error(error);
    showToast("ログアウトに失敗しました");
  }
}

async function ensureStaffProfile(user) {
  const ref = db.collection("staffs").doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) {
    return snap.data();
  }

  const fallbackDisplayName = normalizeName(user.displayName || user.email?.split("@")[0] || "未設定");

  const profile = {
    uid: user.uid,
    email: user.email || "",
    displayName: fallbackDisplayName,
    role: "staff",
    status: "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await ref.set(profile);
  return profile;
}

// ================================
// Firestore 取得
// ================================
async function loadWeekData() {
  const weekKey = state.targetWeek.weekKey;

  const [applicationsSnap, assignmentsSnap] = await Promise.all([
    db.collection("applications")
      .where("weekKey", "==", weekKey)
      .get(),
    db.collection("assignments")
      .where("weekKey", "==", weekKey)
      .get()
  ]);

  state.applications = applicationsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return aTime - bTime;
    });

  state.assignments = assignmentsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function loadApprovedUsers() {
  const snap = await db.collection("staffs")
    .where("status", "==", "approved")
    .get();

  state.approvedUsers = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja"));
}

async function loadPendingUsers() {
  const snap = await db.collection("staffs")
    .where("status", "==", "pending")
    .get();

  state.pendingUsers = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja"));
}

// ================================
// スタッフ画面
// ================================
function renderScheduleTable({ editable = false, mountEl }) {
  const assignmentMap = getAssignmentMap(state.assignments);

  let html = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th></th>
          ${state.targetWeek.dates.map((date, index) => `
            <th>
              ${formatMonthDay(date)}<br>
              <span>${WEEKDAY_LABELS[index]}</span>
            </th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  SHIFT_TYPES.forEach((shift) => {
    html += `<tr><th>${shift.label}</th>`;

    state.targetWeek.dates.forEach((date) => {
      const dateKey = formatDateKey(date);
      const key = `${dateKey}_${shift.key}`;
      const assignment = assignmentMap[key];

      if (editable) {
        html += `
          <td>
            <input
              class="assignment-input"
              type="text"
              data-date-key="${dateKey}"
              data-shift-type="${shift.key}"
              value="${escapeHtml(assignment?.assignedDisplayName || "")}"
              placeholder="未設定"
              maxlength="20"
            />
          </td>
        `;
      } else {
        html += `
          <td>
            ${
              assignment?.assignedDisplayName
                ? `<span class="final-name">${escapeHtml(assignment.assignedDisplayName)}</span>`
                : `<span class="empty-text">未定</span>`
            }
          </td>
        `;
      }
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
  mountEl.innerHTML = html;
}

function renderStaffApplyCards() {
  const myApps = state.applications.filter((app) => app.userId === state.currentUser.uid);
  const myAppMap = {};
  myApps.forEach((app) => {
    myAppMap[`${app.dateKey}_${app.shiftType}`] = app;
  });

  els.staffSubmissionCount.textContent = `提出 ${myApps.length}件`;

  let html = "";

  state.targetWeek.dates.forEach((date, index) => {
    const dateKey = formatDateKey(date);

    html += `
      <article class="day-card">
        <div class="day-card-head">
          <h3>${formatMonthDay(date)}(${WEEKDAY_LABELS[index]})</h3>
          <span>提出操作</span>
        </div>
    `;

    SHIFT_TYPES.forEach((shift) => {
      const currentApp = myAppMap[`${dateKey}_${shift.key}`];
      const isApplied = !!currentApp;

      html += `
        <div class="shift-row">
          <div class="shift-meta">
            <span class="shift-label">${shift.label}</span>
            <span class="shift-caption">${isApplied ? "タップで取り消し" : "応募する"}</span>
          </div>
          <button
            class="apply-btn ${isApplied ? "applied" : ""}"
            data-date-key="${dateKey}"
            data-day-index="${index}"
            data-shift-type="${shift.key}"
            data-application-id="${currentApp?.id || ""}"
            type="button"
          >
            ${isApplied ? "応募済み" : "＋"}
          </button>
        </div>
      `;
    });

    html += `</article>`;
  });

  els.staffApplyList.innerHTML = html;
}

async function toggleApplication({ dateKey, dayIndex, shiftType, applicationId }) {
  if (!state.currentUser || !state.profile) return;

  try {
    if (applicationId) {
      await db.collection("applications").doc(applicationId).delete();
      showToast("応募を取り消しました");
    } else {
      await db.collection("applications").add({
        weekKey: state.targetWeek.weekKey,
        dateKey,
        dayIndex: Number(dayIndex),
        shiftType,
        userId: state.currentUser.uid,
        displayName: state.profile.displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast("応募しました");
    }

    await refreshForCurrentRole();
  } catch (error) {
    console.error(error);
    showToast("応募の保存に失敗しました");
  }
}

async function loadStaffScreen() {
  await loadWeekData();

  els.staffHeaderMeta.textContent = `${state.profile.displayName} さん / 対象週 ${state.targetWeek.label}`;
  els.staffFinalWeekLabel.textContent = `確定版 ${state.targetWeek.label}`;
  els.staffApplyWeekLabel.textContent = `提出対象 ${state.targetWeek.label}`;

  renderScheduleTable({ editable: false, mountEl: els.staffFinalTable });
  renderStaffApplyCards();

  showOnlyScreen(els.staffScreen);
}

// ================================
// 管理者画面
// ================================
function renderRecruitingOverview() {
  const submittedUserIds = [...new Set(state.applications.map((app) => app.userId))];
  const approvedUsers = state.approvedUsers;
  const submittedUsers = approvedUsers.filter((user) => submittedUserIds.includes(user.uid || user.id));
  const notSubmittedUsers = approvedUsers.filter((user) => !submittedUserIds.includes(user.uid || user.id));

  els.approvedCount.textContent = String(approvedUsers.length);
  els.submittedCount.textContent = String(submittedUsers.length);
  els.notSubmittedCount.textContent = String(notSubmittedUsers.length);
  els.applicationCount.textContent = String(state.applications.length);

  els.submittedUserList.innerHTML = submittedUsers.length
    ? submittedUsers.map((user) => `<span class="chip submitted">${escapeHtml(user.displayName)}</span>`).join("")
    : `<span class="chip">まだなし</span>`;

  els.notSubmittedUserList.innerHTML = notSubmittedUsers.length
    ? notSubmittedUsers.map((user) => `<span class="chip missing">${escapeHtml(user.displayName)}</span>`).join("")
    : `<span class="chip submitted">全員提出済み</span>`;
}

function renderRecruitingList() {
  const appMap = getApplicationsMap(state.applications);

  let html = "";

  state.targetWeek.dates.forEach((date, index) => {
    const dateKey = formatDateKey(date);

    html += `
      <article class="recruit-day-card">
        <div class="recruit-day-head">
          ${formatMonthDay(date)}(${WEEKDAY_LABELS[index]})
        </div>
        <div class="recruit-day-body">
    `;

    SHIFT_TYPES.forEach((shift) => {
      const apps = appMap[`${dateKey}_${shift.key}`] || [];
      html += `
        <div class="shift-applicants">
          <div class="shift-applicants-head">
            <span>${shift.label}</span>
            <span>${apps.length}名</span>
          </div>
          <div class="chip-list">
            ${
              apps.length
                ? apps.map((app) => `<span class="chip">${escapeHtml(app.displayName)}</span>`).join("")
                : `<span class="chip">応募なし</span>`
            }
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </article>
    `;
  });

  els.managerRecruitingList.innerHTML = html;
}

function renderPendingUsers() {
  if (!state.pendingUsers.length) {
    els.pendingUserList.innerHTML = `
      <div class="pending-user-card">
        <div class="pending-user-meta">
          <strong>承認待ちユーザーはいません</strong>
        </div>
      </div>
    `;
    return;
  }

  els.pendingUserList.innerHTML = state.pendingUsers.map((user) => `
    <article class="pending-user-card">
      <div class="pending-user-meta">
        <strong>${escapeHtml(user.displayName || "未設定")}</strong>
        <span>${escapeHtml(user.email || "")}</span>
      </div>
      <div class="pending-actions">
        <button class="primary-btn approve-user-btn" data-user-id="${user.uid || user.id}" type="button">承認</button>
      </div>
    </article>
  `).join("");
}

async function approveUser(userId) {
  try {
    await db.collection("staffs").doc(userId).update({
      status: "approved"
    });
    showToast("承認しました");
    await refreshForCurrentRole();
  } catch (error) {
    console.error(error);
    showToast("承認に失敗しました");
  }
}

function pickFairRandomCandidate(candidates, counts, excludedUserIds = new Set()) {
  const filtered = candidates.filter((candidate) => !excludedUserIds.has(candidate.userId));
  if (!filtered.length) return null;

  const minCount = Math.min(...filtered.map((candidate) => counts[candidate.userId] || 0));
  const leastAssigned = filtered.filter((candidate) => (counts[candidate.userId] || 0) === minCount);
  const randomIndex = Math.floor(Math.random() * leastAssigned.length);
  return leastAssigned[randomIndex];
}

function chooseAssignmentsForDay(dateKey, counts, appMap) {
  const selected = {
    early: null,
    late: null
  };

  const earlyCandidates = appMap[`${dateKey}_early`] || [];
  const lateCandidates = appMap[`${dateKey}_late`] || [];

  const order = [
    { key: "early", candidates: earlyCandidates },
    { key: "late", candidates: lateCandidates }
  ].sort((a, b) => a.candidates.length - b.candidates.length);

  const usedUserIds = new Set();

  order.forEach((item) => {
    const picked = pickFairRandomCandidate(item.candidates, counts, usedUserIds);
    if (!picked) {
      selected[item.key] = null;
      return;
    }

    selected[item.key] = picked;
    usedUserIds.add(picked.userId);
    counts[picked.userId] = (counts[picked.userId] || 0) + 1;
  });

  return selected;
}

async function generateSchedule() {
  if (!confirm("現在の応募状況から確定版を作成します。上書きしますか？")) {
    return;
  }

  try {
    await loadWeekData();

    const appMap = getApplicationsMap(state.applications);
    const counts = {};
    const batch = db.batch();

    state.targetWeek.dates.forEach((date, index) => {
      const dateKey = formatDateKey(date);
      const picked = chooseAssignmentsForDay(dateKey, counts, appMap);

      SHIFT_TYPES.forEach((shift) => {
        const docRef = db.collection("assignments").doc(
          getCellDocId(state.targetWeek.weekKey, dateKey, shift.key)
        );

        const winner = picked[shift.key];
        if (winner) {
          batch.set(docRef, {
            weekKey: state.targetWeek.weekKey,
            dateKey,
            dayIndex: index,
            shiftType: shift.key,
            assignedUserId: winner.userId,
            assignedDisplayName: winner.displayName,
            generatedBy: state.currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            manual: false
          });
        } else {
          batch.delete(docRef);
        }
      });
    });

    await batch.commit();
    showToast("シフトを自動作成しました");
    await refreshForCurrentRole();
  } catch (error) {
    console.error(error);
    showToast("自動作成に失敗しました");
  }
}

async function saveManualAssignments() {
  try {
    const inputs = [...document.querySelectorAll(".assignment-input")];
    const batch = db.batch();

    inputs.forEach((input) => {
      const dateKey = input.dataset.dateKey;
      const shiftType = input.dataset.shiftType;
      const value = normalizeName(input.value);
      const docRef = db.collection("assignments").doc(
        getCellDocId(state.targetWeek.weekKey, dateKey, shiftType)
      );

      if (!value) {
        batch.delete(docRef);
      } else {
        batch.set(docRef, {
          weekKey: state.targetWeek.weekKey,
          dateKey,
          shiftType,
          assignedUserId: null,
          assignedDisplayName: value,
          generatedBy: state.currentUser.uid,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          manual: true
        });
      }
    });

    await batch.commit();
    showToast("確定版を保存しました");
    await refreshForCurrentRole();
  } catch (error) {
    console.error(error);
    showToast("確定版の保存に失敗しました");
  }
}

async function loadManagerScreen() {
  await Promise.all([
    loadWeekData(),
    loadApprovedUsers(),
    loadPendingUsers()
  ]);

  els.managerHeaderMeta.textContent = `${state.profile.displayName} さん / 募集対象 ${state.targetWeek.label}`;
  els.managerRecruitingWeekLabel.textContent = `募集中 ${state.targetWeek.label}`;
  els.managerFinalWeekLabel.textContent = `確定版 ${state.targetWeek.label}`;

  renderRecruitingOverview();
  renderRecruitingList();
  renderScheduleTable({ editable: true, mountEl: els.managerFinalTable });
  renderPendingUsers();

  showOnlyScreen(els.managerScreen);
}

// ================================
// 画面分岐
// ================================
async function refreshForCurrentRole() {
  state.targetWeek = getNextWeekInfo();

  if (!state.currentUser) {
    showOnlyScreen(els.authScreen);
    return;
  }

  state.profile = await ensureStaffProfile(state.currentUser);

  if (state.profile.status !== "approved") {
    els.pendingUserText.textContent = `${state.profile.displayName || state.currentUser.email} / 承認待ち`;
    showOnlyScreen(els.pendingScreen);
    return;
  }

  if (state.profile.role === "manager") {
    await loadManagerScreen();
  } else {
    await loadStaffScreen();
  }
}

// ================================
// イベント
// ================================
els.showLoginTabBtn.addEventListener("click", () => {
  els.showLoginTabBtn.classList.add("active");
  els.showRegisterTabBtn.classList.remove("active");
  els.loginTab.classList.remove("hidden");
  els.registerTab.classList.add("hidden");
});

els.showRegisterTabBtn.addEventListener("click", () => {
  els.showRegisterTabBtn.classList.add("active");
  els.showLoginTabBtn.classList.remove("active");
  els.registerTab.classList.remove("hidden");
  els.loginTab.classList.add("hidden");
});

els.loginForm.addEventListener("submit", loginUser);
els.registerForm.addEventListener("submit", registerUser);

els.pendingLogoutBtn.addEventListener("click", logoutUser);
els.staffLogoutBtn.addEventListener("click", logoutUser);
els.managerLogoutBtn.addEventListener("click", logoutUser);

document.querySelectorAll(".staff-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(
      document.querySelectorAll(".staff-tab-btn"),
      document.querySelectorAll("#staff-screen .panel-section"),
      btn.dataset.target
    );
  });
});

document.querySelectorAll(".manager-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(
      document.querySelectorAll(".manager-tab-btn"),
      document.querySelectorAll("#manager-screen .panel-section"),
      btn.dataset.target
    );
  });
});

els.staffApplyList.addEventListener("click", async (event) => {
  const btn = event.target.closest(".apply-btn");
  if (!btn) return;

  await toggleApplication({
    dateKey: btn.dataset.dateKey,
    dayIndex: btn.dataset.dayIndex,
    shiftType: btn.dataset.shiftType,
    applicationId: btn.dataset.applicationId || ""
  });
});

els.pendingUserList.addEventListener("click", async (event) => {
  const btn = event.target.closest(".approve-user-btn");
  if (!btn) return;

  await approveUser(btn.dataset.userId);
});

els.generateScheduleBtn.addEventListener("click", generateSchedule);
els.saveFinalBtn.addEventListener("click", saveManualAssignments);

// ================================
// Auth 監視
// ================================
auth.onAuthStateChanged(async (user) => {
  state.currentUser = user;

  try {
    await refreshForCurrentRole();
  } catch (error) {
    console.error(error);
    showToast("画面の読み込みに失敗しました");
    showOnlyScreen(els.authScreen);
  }
});
