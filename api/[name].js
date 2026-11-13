/* Generated from server/vercelHandler.ts. Do not edit. */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// supabase/functions/_shared/orgStatus.ts
var orgStatus_exports = {};
__export(orgStatus_exports, {
  GRACE_DAYS: () => GRACE_DAYS,
  TRIAL_LEVEL_MAX: () => TRIAL_LEVEL_MAX,
  TRIAL_SEAT_CAP: () => TRIAL_SEAT_CAP,
  decideEnterLevel: () => decideEnterLevel,
  effectiveStatus: () => effectiveStatus,
  isLevelEntitled: () => isLevelEntitled,
  levelOrderOf: () => levelOrderOf,
  seatLimit: () => seatLimit
});
function effectiveStatus(org, now = /* @__PURE__ */ new Date()) {
  const t = now.getTime();
  const grace = GRACE_DAYS * DAY_MS;
  if (org.status === "disabled") return "disabled";
  if (org.status === "trial" && org.trialExpireAt) {
    const end = new Date(org.trialExpireAt).getTime();
    if (Number.isFinite(end) && t > end + grace) return "disabled";
    if (Number.isFinite(end) && t > end) return "expired";
  }
  if (org.status === "active" && org.serviceEndAt) {
    const end = new Date(org.serviceEndAt).getTime();
    if (Number.isFinite(end) && t > end + grace) return "disabled";
    if (Number.isFinite(end) && t > end) return "expired";
  }
  if (org.status === "expired") {
    const mark = org.serviceEndAt ?? org.trialExpireAt;
    if (mark) {
      const end = new Date(mark).getTime();
      if (Number.isFinite(end) && t > end + grace) return "disabled";
    }
  }
  return org.status;
}
function seatLimit(org, effective) {
  if (org.status === "trial" || effective === "trial") return Math.min(org.seatQuota, TRIAL_SEAT_CAP);
  return org.seatQuota;
}
function levelOrderOf(levelId) {
  const matched = /^L(\d+)$/i.exec(levelId.trim());
  if (!matched) return null;
  const order = Number(matched[1]);
  if (!Number.isInteger(order) || order < 1) return null;
  return order;
}
function isLevelEntitled(rows, orgId, groupId, studentId, order) {
  return rows.some(
    (row) => row.orgId === orgId && order >= row.levelOrderMin && order <= row.levelOrderMax && (row.subjectType === "org" && row.subjectId === orgId || row.subjectType === "group" && row.subjectId === groupId || row.subjectType === "student" && row.subjectId === studentId)
  );
}
function decideEnterLevel(input) {
  if (input.levelOrder == null) return { allowed: false, reason: "not_found" };
  if (input.status === "disabled") return { allowed: false, reason: "org_disabled" };
  if (input.status !== "trial" && input.status !== "active") return { allowed: false, reason: "org_expired" };
  if (input.status === "trial" && input.levelOrder > TRIAL_LEVEL_MAX) return { allowed: false, reason: "trial_locked" };
  if (!input.entitled) return { allowed: false, reason: "not_entitled" };
  return { allowed: true, reason: "ok" };
}
var GRACE_DAYS, TRIAL_SEAT_CAP, TRIAL_LEVEL_MAX, DAY_MS;
var init_orgStatus = __esm({
  "supabase/functions/_shared/orgStatus.ts"() {
    "use strict";
    GRACE_DAYS = 30;
    TRIAL_SEAT_CAP = 10;
    TRIAL_LEVEL_MAX = 3;
    DAY_MS = 24 * 60 * 60 * 1e3;
  }
});

// supabase/functions/_shared/bindCode.ts
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var NEW_BIND_CODE = /^[A-HJ-NP-Z2-9]{10}$/;
var LEGACY_BIND_CODE = /^\d{6}$/;
function generateBindCode() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}
function normalizeBindCode(raw) {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}
function isAcceptableBindCode(code) {
  return LEGACY_BIND_CODE.test(code) || NEW_BIND_CODE.test(code);
}

// supabase/functions/_shared/coursePackage.ts
function asArray(pkg) {
  if (Array.isArray(pkg)) return pkg.filter((item) => item && typeof item === "object");
  if (pkg && typeof pkg === "object" && Array.isArray(pkg.levels)) {
    return pkg.levels.filter((item) => item && typeof item === "object");
  }
  return [];
}
function validateCoursePackage(text) {
  const issues = [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      report: {
        ok: false,
        imported: 0,
        skipped: 0,
        issues: [{ levelId: "-", field: "\u6587\u4EF6", message: "\u4E0D\u662F\u5408\u6CD5\u7684 JSON\uFF0C\u68C0\u67E5\u4E00\u4E0B\u9017\u53F7\u548C\u5F15\u53F7\u3002", severity: "error" }]
      },
      levels: []
    };
  }
  const rawLevels = asArray(parsed);
  if (!rawLevels.length) {
    return {
      report: {
        ok: false,
        imported: 0,
        skipped: 0,
        issues: [{ levelId: "-", field: "\u6839\u8282\u70B9", message: "\u9700\u8981\u662F\u4E00\u4E2A\u6570\u7EC4\uFF0C\u6216\u5305\u542B levels \u6570\u7EC4\u7684\u5BF9\u8C61\u3002", severity: "error" }]
      },
      levels: []
    };
  }
  const seenIds = /* @__PURE__ */ new Set();
  const seenOrders = /* @__PURE__ */ new Set();
  const valid = [];
  rawLevels.forEach((raw, index) => {
    const label = typeof raw.level_id === "string" ? raw.level_id : `\u7B2C ${index + 1} \u6761`;
    const before = issues.length;
    const push = (field, message) => issues.push({ levelId: label, field, message, severity: "error" });
    if (typeof raw.level_id !== "string" || !raw.level_id) push("level_id", "\u7F3A\u5C11 level_id\uFF08\u5B57\u7B26\u4E32\uFF09");
    else if (seenIds.has(raw.level_id)) push("level_id", "level_id \u91CD\u590D");
    if (typeof raw.order !== "number" || Number.isNaN(raw.order)) push("order", "\u7F3A\u5C11 order\uFF08\u6570\u5B57\uFF09");
    else if (seenOrders.has(raw.order)) push("order", "order \u4E0E\u5176\u4ED6\u5173\u5361\u91CD\u590D");
    if (!raw.title || typeof raw.title !== "string") push("title", "\u7F3A\u5C11 title");
    if (!raw.goal || typeof raw.goal !== "string") push("goal", "\u7F3A\u5C11 goal");
    if (!raw.demo_code || typeof raw.demo_code !== "string") push("demo_code", "\u7F3A\u5C11 demo_code");
    if (!Array.isArray(raw.teach_code_lines) || raw.teach_code_lines.length === 0) {
      push("teach_code_lines", "teach_code_lines \u9700\u8981\u662F\u975E\u7A7A\u6570\u7EC4");
    }
    if (!Array.isArray(raw.keywords) || raw.keywords.length < 3 || raw.keywords.length > 5) {
      push("keywords", "keywords \u9700\u8981 3\u20145 \u4E2A\u5173\u952E\u8BCD");
    }
    if (raw.challenge_params !== void 0 && !Array.isArray(raw.challenge_params)) {
      push("challenge_params", "challenge_params \u9700\u8981\u662F\u6570\u7EC4");
    }
    if (raw.error_mappings !== void 0 && !Array.isArray(raw.error_mappings)) {
      push("error_mappings", "error_mappings \u9700\u8981\u662F\u6570\u7EC4");
    }
    if (typeof raw.estimated_minutes !== "number") push("estimated_minutes", "\u7F3A\u5C11 estimated_minutes\uFF08\u6570\u5B57\uFF09");
    if (Array.isArray(raw.teach_code_lines) && raw.teach_code_lines.length > 15) {
      issues.push({
        levelId: label,
        field: "teach_code_lines",
        message: "\u4EE3\u7801\u884C\u6570\u8D85\u8FC7 15 \u884C\uFF0C\u8D85\u51FA 1.0 \u5E74\u7EA7\u4E0A\u9650\uFF0C\u5EFA\u8BAE\u62C6\u8282\u3002",
        severity: "warning"
      });
    }
    const hasError = issues.slice(before).some((issue) => issue.severity === "error");
    if (!hasError && typeof raw.level_id === "string" && typeof raw.order === "number") {
      seenIds.add(raw.level_id);
      seenOrders.add(raw.order);
      const quiz = raw.quiz && typeof raw.quiz === "object" ? raw.quiz : {
        question: "\u8FD9\u4E00\u5173\u4F1A\u753B\u51FA\u4EC0\u4E48\uFF1F",
        options: ["\u4E00\u4E2A\u56FE\u5F62", "\u4E00\u884C\u6587\u5B57", "\u4EC0\u4E48\u90FD\u6CA1\u6709"],
        answerIndex: 0,
        explain: "\u8FD0\u884C\u4E00\u6B21\u5C31\u80FD\u770B\u5230\u7ED3\u679C\u3002"
      };
      valid.push({
        level_id: raw.level_id,
        order: raw.order,
        title: String(raw.title),
        goal: String(raw.goal),
        grade_range: typeof raw.grade_range === "string" ? raw.grade_range : "2-5",
        demo_code: String(raw.demo_code),
        expected_output: typeof raw.expected_output === "string" ? raw.expected_output : "",
        preview_kind: raw.preview_kind === "text" ? "text" : "turtle",
        teach_code_lines: raw.teach_code_lines,
        line_notes: Array.isArray(raw.line_notes) ? raw.line_notes : void 0,
        keywords: raw.keywords,
        challenge_params: raw.challenge_params ?? [],
        error_mappings: raw.error_mappings ?? [],
        quiz,
        estimated_minutes: raw.estimated_minutes,
        is_review: Boolean(raw.is_review)
      });
    }
  });
  return {
    report: {
      ok: !issues.some((issue) => issue.severity === "error"),
      imported: valid.length,
      skipped: rawLevels.length - valid.length,
      issues
    },
    levels: valid
  };
}

// server/routes.ts
init_orgStatus();

// supabase/functions/_shared/password.ts
var SCHEME = "pbkdf2-sha256";
var ITERATIONS = 1e5;
var ALPHABET2 = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function bytesToHex(bytes) {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function toArrayBuffer(bytes) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
async function pbkdf2(plain, salt) {
  const key = await crypto.subtle.importKey("raw", toArrayBuffer(new TextEncoder().encode(plain)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations: ITERATIONS },
    key,
    256
  );
  return new Uint8Array(bits);
}
function generateInitialPassword(length = 12) {
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  let out = "";
  for (const n of buf) out += ALPHABET2[n % ALPHABET2.length];
  return out;
}
async function hashPassword(plain) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(plain, salt);
  return `${SCHEME}$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}
async function verifyPassword(plain, stored) {
  const [scheme, rounds, saltHex, hashHex] = stored.split("$");
  if (scheme !== SCHEME || Number(rounds) !== ITERATIONS || !saltHex || !hashHex) return false;
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return false;
  const actual = bytesToHex(await pbkdf2(plain, hexToBytes(saltHex)));
  return safeEqual(actual, hashHex);
}

// supabase/functions/_shared/studentImport.ts
function planStudentImport(input) {
  const lines = input.csv.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const rows = [];
  let used = input.usedSeats;
  const accounts = input.takenAccounts;
  const names = input.takenNames;
  lines.forEach((line, idx) => {
    if (idx === 0 && /姓名/.test(line)) return;
    const cells = line.split(",").map((cell) => cell.trim());
    const [name = "", account = "", groupName = ""] = cells;
    let reason;
    if (!name) reason = "\u59D3\u540D\u7F3A\u5931";
    else if (!account) reason = "\u8D26\u53F7\u7F3A\u5931";
    else if (accounts.has(account.toLowerCase())) reason = "\u8D26\u53F7\u91CD\u590D";
    else if (names.has(name)) reason = "\u59D3\u540D\u91CD\u590D";
    else if (!input.groupNames.includes(groupName)) reason = "\u5206\u7EC4\u4E0D\u5B58\u5728\uFF08\u9700\u4E0E\u5DF2\u6709\u5206\u7EC4\u540D\u4E00\u81F4\uFF09";
    else if (used >= input.seatLimit) reason = "\u5E2D\u4F4D\u5DF2\u6EE1";
    if (reason) {
      rows.push({ row: idx + 1, name, account, groupName, ok: false, reason });
      return;
    }
    accounts.add(account.toLowerCase());
    names.add(name);
    used += 1;
    rows.push({ row: idx + 1, name, account, groupName, ok: true });
  });
  return rows;
}

// server/db.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
var INT_TYPES = /* @__PURE__ */ new Set([20, 21, 23]);
var FLOAT_TYPES = /* @__PURE__ */ new Set([700, 701, 1700]);
var ready = null;
function unquote(value) {
  const trimmed = value.trim();
  const first = trimmed.charCodeAt(0);
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (trimmed.length >= 2 && first === last && (first === 34 || first === 39)) return trimmed.slice(1, -1);
  return trimmed;
}
function loadDatabaseUrl() {
  const fromEnv = unquote(process.env.DATABASE_URL ?? "");
  if (fromEnv) return normalize(fromEnv);
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    const matched = raw.match(/DATABASE_URL="([^"]+)"/) ?? raw.match(/DATABASE_URL=(\S+)/);
    if (matched?.[1]) return normalize(matched[1]);
  } catch {
  }
  throw new Error("missing DATABASE_URL");
}
function normalize(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.delete("channel_binding");
  return url.toString();
}
function prepare(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "undefined") return null;
  return value;
}
function coerce(value, dataTypeID) {
  if (value === null || value === void 0) return null;
  if (dataTypeID === 16) return value === true || value === "t" || value === "true";
  if (INT_TYPES.has(dataTypeID) || FLOAT_TYPES.has(dataTypeID)) {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : value;
  }
  return value;
}
function rowsOf(payload) {
  const fields = payload.fields ?? [];
  return (payload.rows ?? []).map((row) => {
    if (Array.isArray(row)) {
      const record2 = {};
      fields.forEach((field, index) => {
        record2[field.name] = coerce(row[index], field.dataTypeID);
      });
      return record2;
    }
    const record = row && typeof row === "object" ? row : {};
    for (const field of fields) record[field.name] = coerce(record[field.name], field.dataTypeID);
    return record;
  });
}
async function run(text, params) {
  const connectionString = loadDatabaseUrl();
  const host = new URL(connectionString).hostname.replace(/^[^.]+/, "api");
  const response = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "neon-connection-string": connectionString,
      "neon-raw-text-output": "true",
      "neon-array-mode": "true"
    },
    body: JSON.stringify({ query: text, params: params.map(prepare) })
  });
  const raw = await response.text();
  let payload = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }
  if (!response.ok) {
    const message = payload.message?.replace(/postgres(?:ql)?:\/\/\S+/gi, "").trim() || `\u6570\u636E\u5E93 HTTP ${response.status}`;
    throw new Error(message.slice(0, 180));
  }
  return rowsOf(payload);
}
async function q(text, params = []) {
  await ensureSessionTable();
  return await run(text, params);
}
async function one(text, params = []) {
  const rows = await q(text, params);
  return rows[0] ?? null;
}
async function ensureSessionTable() {
  if (!ready) {
    ready = run(
      `create table if not exists public.app_session (
        token_hash text primary key,
        role text not null,
        subject_id uuid not null,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      )`,
      []
    ).then(() => void 0).catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}
function dbMessage(error) {
  return error instanceof Error ? error.message : "";
}

// server/enter.ts
init_orgStatus();
function canonicalLevelId(levelId) {
  const trimmed = levelId.trim();
  if (/^\d+$/.test(trimmed)) {
    const order = Number(trimmed);
    if (order >= 1) return `L${String(order).padStart(2, "0")}`;
  }
  return trimmed;
}
function isOrgStatus(value) {
  return value === "trial" || value === "active" || value === "expired" || value === "disabled";
}
async function decideStudentLevel(studentId, levelId) {
  const canonical = canonicalLevelId(levelId);
  const student = await one(
    "select id, org_id, group_id, status from public.student where id = $1",
    [studentId]
  );
  if (!student || student.status !== "active") {
    return { httpStatus: 401, levelId: canonical, result: { allowed: false, reason: "unauthenticated" } };
  }
  const org = await one(
    "select id, status, trial_expire_at, service_end_at from public.org where id = $1",
    [student.org_id]
  );
  if (!org) return { httpStatus: 200, levelId: canonical, result: { allowed: false, reason: "org_disabled" } };
  const statusRow = await one("select effective_org_status($1, $2, $3) as status", [
    org.status,
    org.trial_expire_at,
    org.service_end_at
  ]);
  if (!isOrgStatus(statusRow?.status)) {
    return { httpStatus: 500, levelId: canonical, result: { allowed: false, reason: "not_found" } };
  }
  const entitlements = await q("select org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at from public.level_entitlement where org_id = $1", [
    student.org_id
  ]);
  const order = /^L(\d+)$/i.exec(canonical);
  const levelOrder = order ? Number(order[1]) : null;
  const open = entitlements.filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now());
  const entitled = levelOrder != null && isLevelEntitled(
    open.map((row) => ({
      orgId: row.org_id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      levelOrderMin: row.level_order_min,
      levelOrderMax: row.level_order_max
    })),
    org.id,
    student.group_id,
    student.id,
    levelOrder
  );
  return {
    httpStatus: 200,
    levelId: canonical,
    result: decideEnterLevel({ status: statusRow.status, levelOrder, entitled })
  };
}

// server/session.ts
import { createHash, randomBytes } from "node:crypto";
async function issueSession(role, subjectId) {
  const accessToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(accessToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  await q("insert into public.app_session (token_hash, role, subject_id, expires_at) values ($1, $2, $3, $4)", [
    tokenHash,
    role,
    subjectId,
    expiresAt
  ]);
  return { accessToken, refreshToken: accessToken };
}
async function readSession(authorization) {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await one(
    "select role, subject_id from public.app_session where token_hash = $1 and expires_at > now()",
    [tokenHash]
  );
  if (!row) return null;
  return { role: row.role, subjectId: row.subject_id };
}

// server/routes.ts
var ok = (body, status = 200) => ({ status, body });
var fail = (status, message) => ({ status, body: { message } });
function isOrgStatus2(value) {
  return value === "trial" || value === "active" || value === "expired" || value === "disabled";
}
async function effectiveStatus2(org) {
  const row = await one("select effective_org_status($1, $2, $3) as status", [
    org.status,
    org.trial_expire_at,
    org.service_end_at
  ]);
  return isOrgStatus2(row?.status) ? row.status : null;
}
function publicError(error) {
  const line = dbMessage(error).split("\n")[0]?.replace(/^ERROR:\s*/, "") ?? "";
  if (line.includes("missing DATABASE_URL")) return "\u670D\u52A1\u672A\u914D\u7F6E";
  const redacted = line.replace(/postgres(?:ql)?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  if (!redacted) return "\u8BF7\u6C42\u5931\u8D25";
  return redacted.length > 160 ? `${redacted.slice(0, 160)}\u2026` : redacted;
}
function friendly(error, known, fallback) {
  const line = dbMessage(error).split("\n")[0]?.replace(/^ERROR:\s*/, "") ?? "";
  if (known.some((item) => line.includes(item))) return fail(400, line);
  return fail(500, fallback);
}
async function requireRole(req, role) {
  const session = await readSession(req.header("authorization"));
  if (!session || session.role !== role) return fail(401, "\u672A\u767B\u5F55");
  return { subjectId: session.subjectId };
}
async function dispatch(req) {
  if (req.method === "OPTIONS") return { status: 204, body: {} };
  if (req.method !== "POST") return fail(405, "\u53EA\u63A5\u53D7 POST");
  try {
    switch (req.name) {
      case "org-login":
        return await orgLogin(req);
      case "student-login":
        return await studentLogin(req);
      case "platform-login":
        return await platformLogin(req);
      case "parent-login":
        return await parentLogin(req);
      case "parent-portal":
        return await parentPortal(req);
      case "org-students":
        return await orgStudents(req);
      case "org-course":
        return await orgCourse(req);
      case "org-dashboard":
        return await orgDashboard(req);
      case "student-learning":
        return await studentLearning(req);
      case "student-enter-level":
        return await studentEnter(req);
      case "public-site":
        return await publicSite(req);
      case "admin-ops":
        return await adminOps(req);
      case "admin-students":
        return await adminStudents(req);
      case "admin-parents":
        return await adminParents(req);
      case "admin-users":
        return await adminUsers(req);
      case "admin-dashboard":
        return await adminDashboard(req);
      case "admin-provision-org":
        return await provisionOrg(req);
      case "course-catalog":
        return await courseCatalog(req);
      default:
        return fail(404, "\u6CA1\u6709\u8FD9\u4E2A\u63A5\u53E3");
    }
  } catch (error) {
    const message = publicError(error);
    console.error("api failed", req.name, dbMessage(error));
    return fail(500, message);
  }
}
async function orgLogin(req) {
  const account = typeof req.body.account === "string" ? req.body.account.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!account || !password) return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  const row = await one("select * from public.org_admin_login_lookup($1)", [account]);
  if (!row) {
    await hashPassword("timing-pad");
    return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  }
  if (!await verifyPassword(password, row.password_hash)) return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  const status = await effectiveStatus2({ status: row.org_status, trial_expire_at: row.trial_expire_at, service_end_at: row.service_end_at });
  if (!status) return fail(500, "\u767B\u5F55\u5931\u8D25");
  if (status === "disabled") return fail(403, "\u673A\u6784\u5DF2\u505C\u7528\uFF0C\u65E0\u6CD5\u767B\u5F55");
  await q("select public.mark_org_admin_login($1)", [row.admin_id]);
  const session = await issueSession("org", row.admin_id);
  return ok({
    ...session,
    adminId: row.admin_id,
    account,
    orgId: row.org_id,
    orgNo: row.org_no,
    orgName: row.org_name,
    status,
    readOnly: status === "expired",
    seatQuota: row.seat_quota,
    usedSeats: row.used_seats,
    trialExpireAt: row.trial_expire_at,
    serviceEndAt: row.service_end_at
  });
}
async function studentLogin(req) {
  const account = typeof req.body.account === "string" ? req.body.account.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!account || !password) return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u5BF9\uFF0C\u95EE\u95EE\u8001\u5E08\u3002");
  const row = await one("select * from public.student_login_lookup($1)", [account]);
  if (!row) {
    await hashPassword("timing-pad");
    return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u5BF9\uFF0C\u95EE\u95EE\u8001\u5E08\u3002");
  }
  if (!await verifyPassword(password, row.password_hash)) return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u5BF9\uFF0C\u95EE\u95EE\u8001\u5E08\u3002");
  const status = await effectiveStatus2({ status: row.org_status, trial_expire_at: row.trial_expire_at, service_end_at: row.service_end_at });
  if (!status) return fail(500, "\u767B\u5F55\u5931\u8D25");
  if (status === "disabled") return fail(403, "\u673A\u6784\u5DF2\u505C\u7528\uFF0C\u65E0\u6CD5\u767B\u5F55");
  const session = await issueSession("student", row.student_id);
  return ok({
    ...session,
    student: {
      id: row.student_id,
      orgId: row.org_id,
      orgName: row.org_name,
      groupId: row.group_id,
      name: row.name,
      account: row.account,
      status: "active",
      currentLevelOrder: row.current_level_order,
      lastActiveAt: row.last_active_at ?? "",
      bindCode: row.bind_code ?? ""
    }
  });
}
async function platformLogin(req) {
  const account = typeof req.body.account === "string" ? req.body.account.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!account || !password) return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  const row = await one(
    "select * from public.platform_login_lookup($1)",
    [account]
  );
  if (!row?.password_hash) {
    await hashPassword("timing-pad");
    return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  }
  if (!await verifyPassword(password, row.password_hash)) return fail(401, "\u8D26\u53F7\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  if (row.role !== "ops" && row.role !== "finance") return fail(403, "\u9700\u8981\u5E73\u53F0\u6743\u9650");
  const session = await issueSession("platform", row.staff_id);
  return ok({ ...session, account: row.account, displayName: row.display_name, role: row.role });
}
var PARENT_ACCOUNT = /^[a-z0-9][a-z0-9._]{2,31}$/;
async function parentLogin(req) {
  const account = typeof req.body.account === "string" ? req.body.account.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!PARENT_ACCOUNT.test(account)) return fail(400, "\u7528\u6237\u540D\u9700\u8981 3\u201332 \u4F4D\uFF0C\u4EE5\u5B57\u6BCD\u6216\u6570\u5B57\u5F00\u5934\uFF0C\u53EA\u80FD\u5305\u542B\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u70B9\u548C\u4E0B\u5212\u7EBF");
  if (password.length < 8 || password.length > 72) return fail(400, "\u5BC6\u7801\u9700\u8981 8\u201372 \u4F4D");
  if (req.body.action === "register") {
    try {
      const created = await one(
        "insert into public.parent_account (account, password_hash) values ($1, $2) returning id",
        [account, await hashPassword(password)]
      );
      if (!created) return fail(500, "\u6CE8\u518C\u5931\u8D25");
      await q("update public.parent_account set last_login_at = now() where id = $1", [created.id]);
      return ok({ ...await issueSession("parent", created.id), account });
    } catch (error) {
      if (dbMessage(error).includes("duplicate") || dbMessage(error).includes("unique")) {
        return fail(409, "\u8FD9\u4E2A\u7528\u6237\u540D\u5DF2\u7ECF\u6CE8\u518C\u8FC7\u4E86\uFF0C\u76F4\u63A5\u767B\u5F55\u5373\u53EF");
      }
      return fail(500, "\u6CE8\u518C\u5931\u8D25");
    }
  }
  const row = await one("select * from public.parent_login_lookup($1)", [account]);
  if (!row) {
    await hashPassword("timing-pad");
    return fail(401, "\u7528\u6237\u540D\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  }
  if (!await verifyPassword(password, row.password_hash)) return fail(401, "\u7528\u6237\u540D\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
  await q("update public.parent_account set last_login_at = now() where id = $1", [row.parent_id]);
  return ok({ ...await issueSession("parent", row.parent_id), account });
}
async function orgContext(req, options) {
  const auth = await requireRole(req, "org");
  if ("status" in auth) return auth;
  const admin = await one("select org_id, status from public.org_admin where id = $1", [auth.subjectId]);
  if (!admin || admin.status !== "active") return fail(401, "\u672A\u767B\u5F55");
  const requested = typeof req.body.orgId === "string" ? req.body.orgId.trim() : "";
  if (requested && requested !== admin.org_id) return fail(403, "\u65E0\u6743\u8BBF\u95EE\u8BE5\u673A\u6784");
  const org = await one("select id, status, seat_quota, used_seats, trial_expire_at, service_end_at from public.org where id = $1", [admin.org_id]);
  if (!org) return fail(401, "\u672A\u767B\u5F55");
  const status = await effectiveStatus2(org);
  if (!status) return fail(500, "\u8BFB\u53D6\u673A\u6784\u72B6\u6001\u5931\u8D25");
  if (status === "disabled") return fail(403, "\u673A\u6784\u5DF2\u505C\u7528");
  if (status === "expired" && (options.write || options.importStudents)) return fail(403, "\u670D\u52A1\u5DF2\u5230\u671F\uFF0C\u4EC5\u53EF\u67E5\u770B");
  const limit = seatLimit({ status: org.status, seatQuota: org.seat_quota }, status);
  if (options.importStudents && org.used_seats >= limit) return fail(409, "\u5E2D\u4F4D\u5DF2\u6EE1");
  return { orgId: org.id, status, seatLimit: limit, usedSeats: org.used_seats };
}
async function orgStudents(req) {
  const action = req.header("x-action") ?? "list";
  const writing = action === "import" || action === "create-group";
  const ctx = await orgContext(req, { write: writing, importStudents: action === "import" });
  if (!("orgId" in ctx)) return ctx;
  if (action === "groups" || action === "create-group") {
    if (action === "create-group") {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      if (name.length < 1 || name.length > 30) return fail(400, "\u5206\u7EC4\u540D\u9700\u8981 1\u201330 \u4E2A\u5B57");
      try {
        await q("insert into public.student_group (org_id, name) values ($1, $2)", [ctx.orgId, name]);
      } catch (error) {
        if (dbMessage(error).includes("duplicate") || dbMessage(error).includes("unique")) return fail(400, "\u5206\u7EC4\u5DF2\u5B58\u5728");
        return fail(500, "\u521B\u5EFA\u5206\u7EC4\u5931\u8D25");
      }
    }
    const groups2 = await q("select id, name from public.student_group where org_id = $1 order by created_at asc", [ctx.orgId]);
    return ok({ groups: groups2 });
  }
  if (action === "unbind-parent") {
    const studentId = typeof req.body.studentId === "string" ? req.body.studentId.trim() : "";
    const student = await one("select id from public.student where id = $1 and org_id = $2", [studentId, ctx.orgId]);
    if (!student) return fail(404, "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F");
    await q("update public.parent_binding set revoked_at = now() where student_id = $1 and revoked_at is null", [studentId]);
    return ok({ ok: true, boundParentCount: 0 });
  }
  if (action !== "import") {
    const students = await q(
      `select s.id, s.name, s.account, s.group_id, s.status, s.bind_code, s.current_level_order, s.last_active_at,
        (select count(*)::int from public.parent_binding b where b.student_id = s.id and b.revoked_at is null) as bound_parent_count
       from public.student s where s.org_id = $1`,
      [ctx.orgId]
    );
    return ok({ students });
  }
  const groups = await q("select id, name from public.student_group where org_id = $1", [ctx.orgId]);
  const groupByName = new Map(groups.map((group) => [group.name, group.id]));
  const csv = typeof req.body.csv === "string" ? req.body.csv : "";
  const lines = csv.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const accounts = /* @__PURE__ */ new Set();
  const names = /* @__PURE__ */ new Set();
  lines.forEach((line, index) => {
    if (index === 0 && /姓名/.test(line)) return;
    const [name = "", account = ""] = line.split(",").map((cell) => cell.trim());
    if (name) names.add(name);
    if (account) accounts.add(account);
  });
  const takenAccounts = /* @__PURE__ */ new Set();
  for (const account of accounts) {
    const found = await one("select account from public.student where lower(account) = lower($1)", [account]);
    if (found) takenAccounts.add(found.account.toLowerCase());
  }
  const nameRows = names.size ? await q("select name from public.student where org_id = $1", [ctx.orgId]) : [];
  const plan = planStudentImport({
    csv,
    groupNames: [...groupByName.keys()],
    usedSeats: ctx.usedSeats,
    seatLimit: ctx.seatLimit,
    takenAccounts,
    takenNames: new Set(nameRows.map((row) => row.name))
  });
  let added = 0;
  const rows = [];
  const issued = /* @__PURE__ */ new Set();
  for (const row of plan) {
    if (!row.ok) {
      rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: row.reason });
      continue;
    }
    const groupId = groupByName.get(row.groupName);
    if (!groupId) {
      rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: "\u5206\u7EC4\u4E0D\u5B58\u5728\uFF08\u9700\u4E0E\u5DF2\u6709\u5206\u7EC4\u540D\u4E00\u81F4\uFF09" });
      continue;
    }
    let plain = generateInitialPassword(8);
    while (issued.has(plain)) plain = generateInitialPassword(8);
    const passwordHash = await hashPassword(plain);
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      try {
        await q(
          `insert into public.student (org_id, group_id, name, account, password_hash, status, bind_code, current_level_order)
           values ($1, $2, $3, $4, $5, 'active', $6, 1)`,
          [ctx.orgId, groupId, row.name, row.account, passwordHash, generateBindCode()]
        );
        inserted = true;
      } catch (error) {
        if (dbMessage(error).includes("bind_code")) continue;
        break;
      }
    }
    if (!inserted) {
      rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: "\u5BFC\u5165\u5931\u8D25" });
      continue;
    }
    added += 1;
    issued.add(plain);
    rows.push({ row: row.row, name: row.name, account: row.account, ok: true, initialPassword: plain });
  }
  if (added > 0) await q("update public.org set used_seats = used_seats + $2 where id = $1", [ctx.orgId, added]);
  return ok({ added, rows });
}
async function orgCourse(req) {
  const action = req.header("x-action") ?? "read";
  const ctx = await orgContext(req, { write: action === "save" });
  if (!("orgId" in ctx)) return ctx;
  const countRow = await one("select count(*)::int as n from public.course_level where published = true");
  const levelCount = countRow?.n ?? 0;
  if (action === "save") {
    const groupId = typeof req.body.groupId === "string" && req.body.groupId ? req.body.groupId : "all";
    const seats = Number(req.body.seats);
    const expiresAt = typeof req.body.expiresAt === "string" ? req.body.expiresAt : "";
    if (!Number.isInteger(seats) || seats < 1) return fail(400, "\u540D\u989D\u81F3\u5C11\u4E3A 1");
    if (seats > ctx.seatLimit) return fail(409, "\u5E2D\u4F4D\u5DF2\u6EE1");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return fail(400, "\u8BF7\u586B\u5199\u6709\u6548\u671F");
    if (groupId !== "all") {
      const group = await one("select id from public.student_group where org_id = $1 and id = $2", [ctx.orgId, groupId]);
      if (!group) return fail(400, "\u5206\u7EC4\u4E0D\u5B58\u5728");
    }
    const activatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await q(
      `insert into public.course_activation (org_id, group_id, seats, expires_at, activated_at)
       values ($1, $2, $3, $4, $5)
       on conflict (org_id) do update set group_id = excluded.group_id, seats = excluded.seats, expires_at = excluded.expires_at, activated_at = excluded.activated_at`,
      [ctx.orgId, groupId, seats, expiresAt, activatedAt]
    );
    const expires = (/* @__PURE__ */ new Date(`${expiresAt}T23:59:59`)).toISOString();
    await q("update public.level_entitlement set expires_at = $2 where org_id = $1 and subject_type = 'org'", [ctx.orgId, expires]);
    if (groupId !== "all") {
      const existing = await one(
        "select id from public.level_entitlement where org_id = $1 and subject_type = 'group' and subject_id = $2",
        [ctx.orgId, groupId]
      );
      const max = ctx.status === "trial" ? 3 : 999;
      if (existing) {
        await q("update public.level_entitlement set level_order_min = 1, level_order_max = $2, expires_at = $3 where id = $1", [
          existing.id,
          max,
          expires
        ]);
      } else {
        await q(
          `insert into public.level_entitlement (org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at)
           values ($1, 'group', $2, 1, $3, $4)`,
          [ctx.orgId, groupId, max, expires]
        );
      }
    }
    return ok({ groupId, seats, expiresAt, activatedAt, levelCount });
  }
  const data = await one(
    "select group_id, seats, expires_at, activated_at from public.course_activation where org_id = $1",
    [ctx.orgId]
  );
  const org = await one(
    "select seat_quota, trial_expire_at, service_end_at, created_at from public.org where id = $1",
    [ctx.orgId]
  );
  const fallbackEnd = (org?.service_end_at ?? org?.trial_expire_at ?? "").slice(0, 10);
  return ok({
    groupId: data?.group_id ?? "all",
    seats: data?.seats ?? org?.seat_quota ?? ctx.seatLimit,
    expiresAt: data?.expires_at ?? fallbackEnd,
    activatedAt: data?.activated_at ?? org?.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
    levelCount
  });
}
async function orgDashboard(req) {
  const ctx = await orgContext(req, {});
  if (!("orgId" in ctx)) return ctx;
  const students = await q("select id, name, account, group_id, status, bind_code, current_level_order, last_active_at from public.student where org_id = $1", [
    ctx.orgId
  ]);
  const groups = await q("select id, name from public.student_group where org_id = $1", [ctx.orgId]);
  const countRow = await one("select count(*)::int as n from public.course_level where published = true");
  const ids = students.map((student) => student.id);
  const progress = ids.length ? await q("select student_id from public.level_progress where completed = true and student_id = any($1::uuid[])", [ids]) : [];
  const typing = ids.length ? await q(
    "select student_id, wpm, accuracy, created_at from public.typing_record where student_id = any($1::uuid[])",
    [ids]
  ) : [];
  const completed = /* @__PURE__ */ new Map();
  for (const row of progress) completed.set(row.student_id, (completed.get(row.student_id) ?? 0) + 1);
  const latestTyping = /* @__PURE__ */ new Map();
  for (const row of typing) {
    const prev = latestTyping.get(row.student_id);
    if (!prev || row.created_at > prev.at) latestTyping.set(row.student_id, { wpm: Number(row.wpm), accuracy: Number(row.accuracy), at: row.created_at });
  }
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
  const activeStudents = students.filter((student) => student.status === "active");
  const totalLevels = countRow?.n ?? 0;
  const avg = activeStudents.reduce((sum, student) => sum + (completed.get(student.id) ?? 0), 0) / Math.max(1, activeStudents.length);
  const groupName = new Map(groups.map((group) => [group.id, group.name]));
  return ok({
    reading: activeStudents.length,
    weeklyActive: activeStudents.filter((student) => student.last_active_at && new Date(student.last_active_at).getTime() >= weekAgo).length,
    avgCompleted: Math.round(avg * 10) / 10,
    totalLevels,
    groupRows: groups.map((group) => {
      const inGroup = activeStudents.filter((student) => student.group_id === group.id);
      const done = inGroup.reduce((sum, student) => sum + (completed.get(student.id) ?? 0), 0);
      const denom = totalLevels * Math.max(1, inGroup.length);
      return { groupId: group.id, name: group.name, rate: inGroup.length && totalLevels ? Math.round(done / denom * 100) : 0, students: inGroup.length };
    }),
    studentRows: students.map((student) => {
      const typingRow = latestTyping.get(student.id);
      return {
        student: {
          id: student.id,
          orgId: ctx.orgId,
          groupId: student.group_id,
          name: student.name,
          account: student.account,
          status: student.status,
          currentLevelOrder: student.current_level_order,
          lastActiveAt: student.last_active_at ?? "",
          bindCode: student.bind_code ?? ""
        },
        groupName: groupName.get(student.group_id) ?? "\u672A\u5206\u7EC4",
        completedCount: completed.get(student.id) ?? 0,
        currentOrder: student.current_level_order,
        typing: typingRow ? { wpm: typingRow.wpm, accuracy: typingRow.accuracy } : null,
        lastActiveAt: student.last_active_at ?? ""
      };
    })
  });
}
function weekStart(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - (copy.getDay() + 6) % 7);
  return copy;
}
function asDay(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
function bucketTyping(rows) {
  const thisWeek = weekStart(/* @__PURE__ */ new Date());
  return [3, 2, 1, 0].map((ago) => {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - ago * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const matched = rows.filter((row) => {
      const day = /* @__PURE__ */ new Date(`${asDay(row.practiced_on)}T00:00:00`);
      return day >= start && day < end;
    });
    const label = `${start.getMonth() + 1}/${start.getDate()}`;
    if (!matched.length) return { weekStart: start.toISOString().slice(0, 10), label, wpm: null, accuracy: null };
    const wpm = matched.reduce((sum, row) => sum + Number(row.wpm), 0) / matched.length;
    const accuracy = matched.reduce((sum, row) => sum + Number(row.accuracy), 0) / matched.length;
    return { weekStart: start.toISOString().slice(0, 10), label, wpm: Math.round(wpm * 10) / 10, accuracy: Math.round(accuracy * 10) / 10 };
  });
}
async function studentLearning(req) {
  const auth = await requireRole(req, "student");
  if ("status" in auth) return { status: auth.status, body: auth.status === 401 ? { message: "\u8BF7\u5148\u767B\u5F55" } : auth.body };
  const student = await one("select id, org_id, group_id, name, account, status, bind_code, current_level_order, last_active_at from public.student where id = $1", [
    auth.subjectId
  ]);
  if (!student || student.status !== "active") return fail(401, "\u8BF7\u5148\u767B\u5F55");
  const action = typeof req.body.action === "string" ? req.body.action : "map";
  const levelRaw = req.body.levelId;
  const requestedLevelId = typeof levelRaw === "number" && Number.isInteger(levelRaw) ? String(levelRaw) : typeof levelRaw === "string" ? levelRaw.trim() : "";
  if (action === "typing") {
    const decision = await decideStudentLevel(student.id, requestedLevelId || "L01");
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result };
    const raw = req.body.practiceType === "baseline_keys" ? "home_row" : req.body.practiceType;
    if (raw !== "home_row" && raw !== "keywords" && raw !== "lesson_embedded") return fail(400, "\u7EC3\u4E60\u7C7B\u578B\u4E0D\u6B63\u786E");
    const wpm = Number(req.body.wpm);
    const accuracy = Number(req.body.accuracy);
    if (!Number.isFinite(wpm) || !Number.isFinite(accuracy)) return fail(400, "\u6253\u5B57\u8BB0\u5F55\u4E0D\u5B8C\u6574");
    await q("insert into public.typing_record (student_id, practiced_on, practice_type, wpm, accuracy) values ($1, current_date, $2, $3, $4)", [
      student.id,
      raw,
      wpm,
      accuracy
    ]);
    return ok({ ok: true });
  }
  if (action === "series") {
    const rows = await q(
      "select practiced_on, wpm, accuracy from public.typing_record where student_id = $1",
      [student.id]
    );
    return ok({ series: bucketTyping(rows) });
  }
  if (action === "touch") {
    const decision = await decideStudentLevel(student.id, requestedLevelId);
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result };
    await q("update public.study_session set ended_at = now() where student_id = $1 and ended_at is null", [student.id]);
    await q("insert into public.study_session (student_id, level_id) values ($1, $2)", [student.id, decision.levelId]);
    await q("update public.student set last_active_at = now() where id = $1", [student.id]);
    return ok({ ok: true });
  }
  if (action === "complete") {
    const decision = await decideStudentLevel(student.id, requestedLevelId);
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result };
    const order = levelOrderOf(decision.levelId);
    const stars = Number(req.body.stars);
    const errorTaps = Number(req.body.errorTaps ?? 0);
    if (!order || !Number.isInteger(stars) || stars < 0 || stars > 3) return fail(400, "\u5B8C\u6210\u8BB0\u5F55\u4E0D\u5B8C\u6574");
    await q("update public.study_session set ended_at = now() where student_id = $1 and ended_at is null", [student.id]);
    const existing = await one("select id, runs from public.level_progress where student_id = $1 and level_id = $2", [
      student.id,
      decision.levelId
    ]);
    const taps = Number.isFinite(errorTaps) ? errorTaps : 0;
    if (existing) {
      await q(
        "update public.level_progress set completed = true, stars = $2, change_done = true, error_taps = $3, runs = $4, updated_at = now() where id = $1",
        [existing.id, stars, taps, existing.runs + 1]
      );
    } else {
      await q(
        "insert into public.level_progress (student_id, level_id, completed, stars, change_done, error_taps, runs) values ($1, $2, true, $3, true, $4, 1)",
        [student.id, decision.levelId, stars, taps]
      );
    }
    if (order + 1 > student.current_level_order) {
      await q("update public.student set current_level_order = $2, last_active_at = now() where id = $1", [student.id, order + 1]);
    } else {
      await q("update public.student set last_active_at = now() where id = $1", [student.id]);
    }
    return ok({ ok: true });
  }
  if (action === "level") {
    const decision = await decideStudentLevel(student.id, requestedLevelId);
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result };
    const found = await one("select body from public.course_level where level_id = $1 and published = true", [decision.levelId]);
    if (!found) return fail(404, "\u6CA1\u6709\u627E\u5230\u8FD9\u4E00\u5173");
    const hints2 = await q("select pattern, friendly_message from public.error_hint");
    return ok({ level: found.body, hints: hints2 });
  }
  const levels = await q(
    "select level_id, sort_order, title, goal, body from public.course_level where published = true order by sort_order asc"
  );
  const org = await one(
    "select id, status, trial_expire_at, service_end_at, name from public.org where id = $1",
    [student.org_id]
  );
  const status = org ? await effectiveStatus2(org) : "disabled";
  const entitlements = await q("select org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at from public.level_entitlement where org_id = $1", [
    student.org_id
  ]);
  const progressRows = await q("select level_id, completed, stars from public.level_progress where student_id = $1", [
    student.id
  ]);
  const hints = await q("select pattern, friendly_message from public.error_hint");
  const group = await one("select name from public.student_group where id = $1", [student.group_id]);
  const progress = new Map(progressRows.map((row) => [row.level_id, row]));
  const { isLevelEntitled: isLevelEntitled2 } = await Promise.resolve().then(() => (init_orgStatus(), orgStatus_exports));
  const open = entitlements.filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now());
  const spans = open.map((row) => ({
    orgId: row.org_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    levelOrderMin: row.level_order_min,
    levelOrderMax: row.level_order_max
  }));
  let seenIncomplete = false;
  const entries = levels.map((level) => {
    const order = level.sort_order;
    const row = progress.get(level.level_id);
    const completed = Boolean(row?.completed);
    const entitled = isLevelEntitled2(spans, student.org_id, student.group_id, student.id, order);
    const openStatus = status === "trial" || status === "active";
    const trialOk = status !== "trial" || order <= 3;
    const unlocked = entitled && openStatus && trialOk && (completed || !seenIncomplete);
    if (!completed) seenIncomplete = true;
    const current = unlocked && !completed && !levels.some((other) => other.sort_order < order && !progress.get(other.level_id)?.completed);
    return {
      levelId: level.level_id,
      order,
      title: level.title,
      goal: level.goal,
      isReview: Boolean(level.body?.is_review),
      completed,
      stars: row?.stars ?? 0,
      unlocked,
      current
    };
  });
  const typingRows = await q(
    "select practiced_on, wpm, accuracy, created_at from public.typing_record where student_id = $1",
    [student.id]
  );
  const latest = [...typingRows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  return ok({
    orgName: org?.name ?? "",
    groupName: group?.name ?? "\u672A\u5206\u7EC4",
    student: {
      id: student.id,
      orgId: student.org_id,
      groupId: student.group_id,
      name: student.name,
      account: student.account,
      status: "active",
      currentLevelOrder: student.current_level_order,
      lastActiveAt: student.last_active_at ?? "",
      bindCode: student.bind_code ?? ""
    },
    entries,
    completedCount: entries.filter((entry) => entry.completed).length,
    currentOrder: entries.find((entry) => entry.current)?.order ?? entries.filter((entry) => entry.completed).length,
    hints,
    typingSeries: bucketTyping(typingRows),
    latestTyping: latest ? { wpm: Number(latest.wpm), accuracy: Number(latest.accuracy) } : null
  });
}
async function studentEnter(req) {
  const auth = await requireRole(req, "student");
  if ("status" in auth) return { status: 401, body: { allowed: false, reason: "unauthenticated" } };
  const student = await one("select status from public.student where id = $1", [auth.subjectId]);
  if (!student || student.status !== "active") return { status: 401, body: { allowed: false, reason: "unauthenticated" } };
  const levelRaw = req.body.levelId;
  const levelId = typeof levelRaw === "number" && Number.isInteger(levelRaw) ? String(levelRaw) : typeof levelRaw === "string" ? levelRaw : "";
  const decision = await decideStudentLevel(auth.subjectId, levelId);
  return { status: decision.httpStatus, body: decision.result };
}
var INVALID_CODE = "\u7ED1\u5B9A\u7801\u65E0\u6548\u6216\u5DF2\u5931\u6548";
function clientIp(req) {
  const forwarded = req.header("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  return (req.header("x-real-ip") ?? "unknown").slice(0, 64);
}
async function parentPortal(req) {
  const auth = await requireRole(req, "parent");
  if ("status" in auth) return auth;
  const parent = await one("select anonymized_at from public.parent_account where id = $1", [auth.subjectId]);
  if (!parent || parent.anonymized_at) return fail(401, "\u8BF7\u5148\u767B\u5F55");
  const action = typeof req.body.action === "string" ? req.body.action : "home";
  if (action === "unbind") {
    const studentId = typeof req.body.studentId === "string" ? req.body.studentId.trim() : "";
    const binding = await one(
      "select id from public.parent_binding where parent_account_id = $1 and student_id = $2 and revoked_at is null",
      [auth.subjectId, studentId]
    );
    if (!binding) return fail(404, "\u6CA1\u6709\u8FD9\u9879\u7ED1\u5B9A");
    await q("update public.parent_binding set revoked_at = now() where id = $1 and parent_account_id = $2", [binding.id, auth.subjectId]);
    return ok({ ok: true });
  }
  if (action === "lookup" || action === "bind") {
    const ip = clientIp(req);
    const code = normalizeBindCode(req.body.code);
    const recent = await one(
      `select count(*)::int as n from public.bind_attempt where ip = $1 and success = false and created_at >= now() - interval '1 hour'`,
      [ip]
    );
    if ((recent?.n ?? 0) >= 10) {
      await q("insert into public.bind_attempt (ip, code_prefix, success) values ($1, $2, false)", [ip, code.slice(0, 4)]);
      return fail(429, "\u5C1D\u8BD5\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF7\u4E00\u5C0F\u65F6\u540E\u518D\u8BD5");
    }
    const target = await resolveBind(code);
    if (!target) {
      await q("insert into public.bind_attempt (ip, code_prefix, success) values ($1, $2, false)", [ip, code.slice(0, 4)]);
      return fail(404, INVALID_CODE);
    }
    if (action === "bind") {
      const existing = await one(
        "select id, revoked_at from public.parent_binding where parent_account_id = $1 and student_id = $2",
        [auth.subjectId, target]
      );
      if (existing?.revoked_at) {
        await q("update public.parent_binding set revoked_at = null where id = $1 and parent_account_id = $2", [existing.id, auth.subjectId]);
      } else if (!existing) {
        await q("insert into public.parent_binding (parent_account_id, student_id) values ($1, $2)", [auth.subjectId, target]);
      }
    }
    await q("insert into public.bind_attempt (ip, code_prefix, success) values ($1, $2, true)", [ip, code.slice(0, 4)]);
    return ok({ ok: true });
  }
  const bindings = await q(
    "select student_id from public.parent_binding where parent_account_id = $1 and revoked_at is null",
    [auth.subjectId]
  );
  if (!bindings.length) return ok({ children: [], stopped: [] });
  const students = await q("select id, name, org_id, group_id, status, current_level_order, last_active_at from public.student where id = any($1::uuid[])", [
    bindings.map((row) => row.student_id)
  ]);
  const children = [];
  const stopped = [];
  for (const student of students) {
    const org = await one(
      "select status, trial_expire_at, service_end_at, name from public.org where id = $1",
      [student.org_id]
    );
    const access = org ? await effectiveStatus2(org) : "disabled";
    if (!access || access === "disabled") {
      stopped.push({ name: student.name, message: "\u673A\u6784\u670D\u52A1\u5DF2\u505C\u6B62" });
      continue;
    }
    const group = await one("select name from public.student_group where id = $1", [student.group_id]);
    const progress = await q("select level_id from public.level_progress where student_id = $1 and completed = true", [student.id]);
    const countRow = await one("select count(*)::int as n from public.course_level where published = true");
    const sessions = await q("select started_at, ended_at from public.study_session where student_id = $1", [
      student.id
    ]);
    const typing = await q(
      "select practiced_on, wpm, accuracy from public.typing_record where student_id = $1",
      [student.id]
    );
    const totalLevels = countRow?.n ?? 0;
    const order = Math.min(totalLevels || 1, Math.max(1, student.current_level_order));
    const currentLevel = await one("select title from public.course_level where sort_order = $1", [order]);
    const start = weekStart(/* @__PURE__ */ new Date());
    const weeklySessions = sessions.filter((row) => new Date(row.started_at).getTime() >= start.getTime());
    const minutes = weeklySessions.reduce((sum, row) => {
      if (!row.ended_at) return sum;
      const span = (new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 6e4;
      return sum + Math.min(45, Math.max(0, span));
    }, 0);
    const last = [...sessions].sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0];
    children.push({
      student: {
        id: student.id,
        orgId: student.org_id,
        groupId: student.group_id,
        name: student.name,
        status: student.status,
        currentLevelOrder: student.current_level_order,
        lastActiveAt: student.last_active_at ?? ""
      },
      groupName: group?.name ?? "\u672A\u5206\u7EC4",
      orgName: org?.name ?? "",
      currentLevelTitle: currentLevel?.title ?? `\u7B2C ${order} \u5173`,
      currentLevelOrder: order,
      totalLevels: totalLevels || 12,
      completedCount: progress.length,
      weekly: {
        weekStart: start.toISOString().slice(0, 10),
        sessions: weeklySessions.length,
        totalMinutes: Math.round(minutes),
        lastStudyDate: last ? asDay(last.started_at) : null
      },
      typingSeries: bucketTyping(typing)
    });
  }
  if (!children.length && stopped.length) return fail(403, "\u673A\u6784\u670D\u52A1\u5DF2\u505C\u6B62");
  return ok({ children, stopped });
}
async function resolveBind(code) {
  if (!isAcceptableBindCode(code)) return null;
  const student = await one("select id, org_id, status from public.student where bind_code = $1", [code]);
  if (!student || student.status !== "active") return null;
  const org = await one(
    "select status, trial_expire_at, service_end_at from public.org where id = $1",
    [student.org_id]
  );
  if (!org) return null;
  const status = await effectiveStatus2(org);
  if (status === "disabled") return null;
  return student.id;
}
async function publicSite(req) {
  const action = typeof req.body.action === "string" ? req.body.action : "pricing";
  if (action === "apply") {
    try {
      const created = await one(
        "select public.submit_lead($1, $2, $3, $4, $5, $6) as id",
        [
          typeof req.body.orgName === "string" ? req.body.orgName : "",
          typeof req.body.contact === "string" ? req.body.contact : "",
          typeof req.body.phone === "string" ? req.body.phone : "",
          typeof req.body.city === "string" ? req.body.city : "",
          Number(req.body.estStudents),
          typeof req.body.note === "string" ? req.body.note : ""
        ]
      );
      return ok({ id: created?.id });
    } catch (error) {
      return friendly(error, ["\u673A\u6784\u540D\u79F0\u9700\u8981", "\u8054\u7CFB\u4EBA\u9700\u8981", "\u8BF7\u586B\u5199 11 \u4F4D\u624B\u673A\u53F7", "\u8BF7\u586B\u5199\u6240\u5728\u57CE\u5E02", "\u9884\u8BA1\u5B66\u751F\u6570\u9700\u8981", "\u5907\u6CE8\u4E0D\u8D85\u8FC7"], "\u63D0\u4EA4\u5931\u8D25");
    }
  }
  const seats = Number(req.body.seats ?? 40);
  const safeSeats = Number.isInteger(seats) && seats > 0 ? seats : 40;
  const tiers = await q("select min_seats, max_seats, unit_price from public.seat_price_tier order by min_seats");
  const quoted = await one("select * from public.quote_seat_price($1)", [safeSeats]);
  return ok({
    tiers,
    example: quoted ? { seats: safeSeats, unitPrice: quoted.unit_price, amount: quoted.amount, plan: quoted.plan_label } : null
  });
}
var STUDENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function studentPage(value, fallback, max) {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, max);
}
function studentStatus(value) {
  return value === "disabled" ? "disabled" : "active";
}
function asIso(value) {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
function keywordLike(keyword) {
  const cleaned = keyword.trim().slice(0, 40).replace(/[\\%_]/g, "");
  return cleaned ? `%${cleaned}%` : "";
}
async function requireOpsSession(req) {
  const session = await readSession(req.header("authorization"));
  if (!session) return fail(401, "\u9700\u8981\u5E73\u53F0\u8FD0\u8425\u6743\u9650");
  if (session.role !== "platform") return fail(403, "\u9700\u8981\u5E73\u53F0\u8FD0\u8425\u6743\u9650");
  const staff = await one(
    "select id, role, status from public.platform_staff where id = $1",
    [session.subjectId]
  );
  if (!staff || staff.status !== "active" || staff.role !== "ops") return fail(403, "\u9700\u8981\u5E73\u53F0\u8FD0\u8425\u6743\u9650");
  return { id: staff.id };
}
async function publishedLevelTotal() {
  const row = await one("select count(*)::int as total from public.course_level where published = true");
  return Number(row?.total ?? 0);
}
function presentAdminStudent(row) {
  return {
    id: row.id,
    name: row.name,
    account: row.account,
    status: studentStatus(row.status),
    orgId: row.org_id,
    orgName: row.org_name || "\u2014",
    groupName: row.group_name || "\u672A\u5206\u7EC4",
    currentLevelOrder: Number(row.current_level_order) || 1,
    boundParentCount: Number(row.bound_parent_count) || 0,
    lastActiveAt: asIso(row.last_active_at)
  };
}
async function adminStudents(req) {
  const staff = await requireOpsSession(req);
  if ("status" in staff) return staff;
  const action = typeof req.body.action === "string" ? req.body.action : "list";
  try {
    if (action === "list") return await listPlatformStudents(req);
    if (action === "detail") return await platformStudentDetail(req);
    if (action === "reset-password") return await resetPlatformStudentPassword(req);
    return fail(400, "\u4E0D\u8BA4\u8BC6\u7684\u64CD\u4F5C");
  } catch (error) {
    console.error("admin-students failed", action, action === "reset-password" ? "reset" : dbMessage(error));
    return fail(500, action === "reset-password" ? "\u91CD\u7F6E\u5931\u8D25" : "\u8BFB\u53D6\u5931\u8D25");
  }
}
async function listPlatformStudents(req) {
  const page = studentPage(req.body.page, 1, 1e4);
  const pageSize = studentPage(req.body.pageSize, 20, 50);
  const status = typeof req.body.status === "string" ? req.body.status : "";
  if (status && status !== "active" && status !== "disabled") return fail(400, "\u5B66\u751F\u72B6\u6001\u4E0D\u6B63\u786E");
  const orgFilter = typeof req.body.orgId === "string" ? req.body.orgId.trim() : "";
  if (orgFilter && !STUDENT_UUID.test(orgFilter)) return fail(400, "\u673A\u6784\u7B5B\u9009\u65E0\u6548");
  const params = [keywordLike(typeof req.body.keyword === "string" ? req.body.keyword : ""), orgFilter || null, status];
  const where = `
    where ($1::text = '' or s.name ilike $1 or s.account ilike $1)
      and ($2::uuid is null or s.org_id = $2)
      and ($3::text = '' or s.status = $3)`;
  const [totalRow, rows, totalLevels] = await Promise.all([
    one(`select count(*)::int as total from public.student s ${where}`, params),
    q(
      `select
         s.id, s.name, s.account, s.status, s.org_id, o.name as org_name,
         coalesce(g.name, '') as group_name, s.current_level_order, s.last_active_at,
         (
           select count(*)::int from public.parent_binding b
           where b.student_id = s.id and b.revoked_at is null
         ) as bound_parent_count
       from public.student s
       join public.org o on o.id = s.org_id
       left join public.student_group g on g.id::text = s.group_id
       ${where}
       order by s.created_at desc, s.id asc
       limit $4 offset $5`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
    publishedLevelTotal()
  ]);
  return ok({
    page,
    pageSize,
    total: Number(totalRow?.total ?? 0),
    totalLevels,
    students: rows.map(presentAdminStudent)
  });
}
async function platformStudentDetail(req) {
  const studentId = typeof req.body.studentId === "string" ? req.body.studentId.trim() : "";
  if (!studentId) return fail(400, "\u8BF7\u6307\u5B9A\u5B66\u751F");
  if (!STUDENT_UUID.test(studentId)) return fail(400, "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F");
  const [row, totalLevels, parents] = await Promise.all([
    one(
      `select
         s.id, s.name, s.account, s.status, s.org_id, o.name as org_name,
         coalesce(g.name, '') as group_name, s.current_level_order, s.last_active_at, s.bind_code,
         (
           select count(*)::int from public.parent_binding b
           where b.student_id = s.id and b.revoked_at is null
         ) as bound_parent_count
       from public.student s
       join public.org o on o.id = s.org_id
       left join public.student_group g on g.id::text = s.group_id
       where s.id = $1`,
      [studentId]
    ),
    publishedLevelTotal(),
    q(
      `select a.account, b.created_at as bound_at
       from public.parent_binding b
       join public.parent_account a on a.id = b.parent_account_id
       where b.student_id = $1 and b.revoked_at is null and a.anonymized_at is null
       order by b.created_at desc`,
      [studentId]
    )
  ]);
  if (!row) return fail(404, "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F");
  return ok({
    totalLevels,
    student: { ...presentAdminStudent(row), bindCode: row.bind_code ?? "" },
    parents: parents.map((parent) => ({ account: parent.account, boundAt: asIso(parent.bound_at) ?? String(parent.bound_at ?? "") }))
  });
}
async function resetPlatformStudentPassword(req) {
  const studentId = typeof req.body.studentId === "string" ? req.body.studentId.trim() : "";
  if (!studentId) return fail(400, "\u8BF7\u6307\u5B9A\u5B66\u751F");
  if (!STUDENT_UUID.test(studentId)) return fail(400, "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F");
  const plain = generateInitialPassword(8);
  const updated = await one(
    "update public.student set password_hash = $1 where id = $2 returning id",
    [await hashPassword(plain), studentId]
  );
  if (!updated) return fail(404, "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F");
  return ok({ password: plain });
}
async function adminParents(req) {
  const staff = await requireOpsSession(req);
  if ("status" in staff) return staff;
  const action = typeof req.body.action === "string" ? req.body.action : "list";
  try {
    if (action === "list") return await listPlatformParents(req);
    if (action === "detail") return await platformParentDetail(req);
    if (action === "unbind") return await unbindPlatformParent(req);
    if (action === "reset-password") return await resetPlatformParentPassword(req);
    return fail(400, "\u4E0D\u8BA4\u8BC6\u7684\u64CD\u4F5C");
  } catch (error) {
    console.error("admin-parents failed", action, action === "reset-password" ? "reset" : dbMessage(error));
    return fail(500, action === "reset-password" ? "\u91CD\u7F6E\u5931\u8D25" : action === "unbind" ? "\u89E3\u9664\u5931\u8D25" : "\u8BFB\u53D6\u5931\u8D25");
  }
}
function presentAdminParent(row, mask = false) {
  const account = row.account;
  return {
    id: row.id,
    account: mask ? `${account.trim().slice(0, 3)}****` : account,
    childCount: Number(row.child_count) || 0,
    createdAt: asIso(row.created_at) ?? String(row.created_at ?? ""),
    lastLoginAt: asIso(row.last_login_at)
  };
}
async function listPlatformParents(req, mask = false) {
  const page = studentPage(req.body.page, 1, 1e4);
  const pageSize = studentPage(req.body.pageSize, 20, 50);
  const params = [keywordLike(typeof req.body.keyword === "string" ? req.body.keyword : "")];
  const where = `
    where p.anonymized_at is null
      and ($1::text = '' or p.account ilike $1 or exists (
      select 1 from public.parent_binding b
      join public.student s on s.id = b.student_id
      where b.parent_account_id = p.id
        and b.revoked_at is null
        and s.name ilike $1
    ))`;
  const [totalRow, rows] = await Promise.all([
    one(`select count(*)::int as total from public.parent_account p ${where}`, params),
    q(
      `select
         p.id, p.account, p.created_at, p.last_login_at,
         (
           select count(*)::int from public.parent_binding b
           where b.parent_account_id = p.id and b.revoked_at is null
         ) as child_count
       from public.parent_account p
       ${where}
       order by p.created_at desc, p.id asc
       limit $2 offset $3`,
      [...params, pageSize, (page - 1) * pageSize]
    )
  ]);
  return ok({
    page,
    pageSize,
    total: Number(totalRow?.total ?? 0),
    parents: rows.map((row) => presentAdminParent(row, mask))
  });
}
async function platformParentDetail(req) {
  const parentId = typeof req.body.parentId === "string" ? req.body.parentId.trim() : "";
  if (!parentId) return fail(400, "\u8BF7\u6307\u5B9A\u5BB6\u957F");
  if (!STUDENT_UUID.test(parentId)) return fail(400, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  const [row, children] = await Promise.all([
    one(
      `select
         p.id, p.account, p.created_at, p.last_login_at,
         (
           select count(*)::int from public.parent_binding b
           where b.parent_account_id = p.id and b.revoked_at is null
         ) as child_count
       from public.parent_account p
       where p.id = $1 and p.anonymized_at is null`,
      [parentId]
    ),
    q(
      `select s.id as student_id, s.name, o.name as org_name, b.created_at as bound_at
       from public.parent_binding b
       join public.student s on s.id = b.student_id
       join public.org o on o.id = s.org_id
       where b.parent_account_id = $1 and b.revoked_at is null
       order by b.created_at desc`,
      [parentId]
    )
  ]);
  if (!row) return fail(404, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  return ok({
    parent: presentAdminParent(row),
    children: children.map((child) => ({
      studentId: child.student_id,
      name: child.name,
      orgName: child.org_name || "\u2014",
      boundAt: asIso(child.bound_at) ?? String(child.bound_at ?? "")
    }))
  });
}
async function unbindPlatformParent(req) {
  const parentId = typeof req.body.parentId === "string" ? req.body.parentId.trim() : "";
  const studentId = typeof req.body.studentId === "string" ? req.body.studentId.trim() : "";
  if (!parentId || !studentId) return fail(400, "\u8BF7\u6307\u5B9A\u8981\u89E3\u9664\u7684\u7ED1\u5B9A");
  if (!STUDENT_UUID.test(parentId) || !STUDENT_UUID.test(studentId)) return fail(400, "\u6CA1\u6709\u8FD9\u9879\u7ED1\u5B9A");
  const updated = await one(
    `update public.parent_binding
     set revoked_at = now()
     where parent_account_id = $1 and student_id = $2 and revoked_at is null
     returning id`,
    [parentId, studentId]
  );
  if (!updated) return fail(404, "\u6CA1\u6709\u8FD9\u9879\u7ED1\u5B9A");
  return ok({ ok: true });
}
async function resetPlatformParentPassword(req) {
  const parentId = typeof req.body.parentId === "string" ? req.body.parentId.trim() : "";
  if (!parentId) return fail(400, "\u8BF7\u6307\u5B9A\u5BB6\u957F");
  if (!STUDENT_UUID.test(parentId)) return fail(400, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  const plain = generateInitialPassword(8);
  const updated = await one(
    "update public.parent_account set password_hash = $1 where id = $2 returning id",
    [await hashPassword(plain), parentId]
  );
  if (!updated) return fail(404, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  return ok({ password: plain });
}
async function adminUsers(req) {
  const staff = await requireOpsSession(req);
  if ("status" in staff) return staff;
  const action = typeof req.body.action === "string" ? req.body.action : "";
  try {
    if (action === "list_students") return await listPlatformStudents(req);
    if (action === "student_detail") return await platformStudentDetail(req);
    if (action === "list_parents") return await listPlatformParents(req, true);
    if (action === "parent_detail") return await platformParentDetail(req);
    if (action === "unbind_parent") return await unbindPlatformParent(req);
    if (action === "reset_password") return await resetPlatformUserPassword(req);
    if (action === "delete_parent") return await deletePlatformParent(req);
    return fail(400, "\u4E0D\u8BA4\u8BC6\u7684\u64CD\u4F5C");
  } catch (error) {
    console.error("admin-users failed", action, action === "reset_password" ? "reset" : dbMessage(error));
    const message = action === "reset_password" ? "\u91CD\u7F6E\u5931\u8D25" : action === "unbind_parent" ? "\u89E3\u9664\u5931\u8D25" : action === "delete_parent" ? "\u6CE8\u9500\u5931\u8D25" : "\u8BFB\u53D6\u5931\u8D25";
    return fail(500, message);
  }
}
async function resetPlatformUserPassword(req) {
  const role = req.body.role === "student" || req.body.role === "parent" ? req.body.role : "";
  const userId = typeof req.body.userId === "string" ? req.body.userId.trim() : "";
  if (!role || !userId) return fail(400, "\u8BF7\u6307\u5B9A\u8981\u91CD\u7F6E\u7684\u8D26\u53F7");
  if (!STUDENT_UUID.test(userId)) return fail(400, role === "student" ? "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F" : "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  const plain = generateInitialPassword(8);
  const passwordHash = await hashPassword(plain);
  if (role === "student") {
    const updated2 = await one("update public.student set password_hash = $1 where id = $2 returning id", [passwordHash, userId]);
    if (!updated2) return fail(404, "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F");
    return ok({ password: plain });
  }
  const updated = await one(
    "update public.parent_account set password_hash = $1 where id = $2 and anonymized_at is null returning id",
    [passwordHash, userId]
  );
  if (!updated) return fail(404, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  return ok({ password: plain });
}
async function deletePlatformParent(req) {
  const parentId = typeof req.body.parentId === "string" ? req.body.parentId.trim() : "";
  if (!parentId) return fail(400, "\u8BF7\u6307\u5B9A\u5BB6\u957F");
  if (!STUDENT_UUID.test(parentId)) return fail(400, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  const existing = await one("select id from public.parent_account where id = $1 and anonymized_at is null", [parentId]);
  if (!existing) return fail(404, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  const discarded = generateInitialPassword(24);
  const account = existing.id.replace(/-/g, "");
  await q("update public.parent_binding set revoked_at = now() where parent_account_id = $1 and revoked_at is null", [parentId]);
  const updated = await one(
    `update public.parent_account
     set account = $2, password_hash = $3, anonymized_at = now()
     where id = $1 and anonymized_at is null
     returning id`,
    [parentId, account, await hashPassword(discarded)]
  );
  if (!updated) return fail(404, "\u6CA1\u6709\u8FD9\u4F4D\u5BB6\u957F");
  await q(`update public.app_session set expires_at = now() where role = 'parent' and subject_id = $1`, [parentId]);
  return ok({ ok: true });
}
var DAY_MS2 = 24 * 60 * 60 * 1e3;
function shanghaiBounds(now = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const nextMonth = month === "12" ? `${Number(year) + 1}-01-01` : `${year}-${String(Number(month) + 1).padStart(2, "0")}-01`;
  return {
    monthStart: (/* @__PURE__ */ new Date(`${year}-${month}-01T00:00:00+08:00`)).getTime(),
    nextMonth: (/* @__PURE__ */ new Date(`${nextMonth}T00:00:00+08:00`)).getTime(),
    dayStart: (/* @__PURE__ */ new Date(`${year}-${month}-${day}T00:00:00+08:00`)).toISOString()
  };
}
function daysUntil(iso, now) {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.ceil((time - now) / DAY_MS2));
}
async function adminDashboard(req) {
  const staff = await requireStaff(req, ["ops", "finance"]);
  if ("status" in staff) return staff;
  const bounds = shanghaiBounds();
  const now = Date.now();
  const [orgs, bills, students, parents] = await Promise.all([
    q("select * from public.list_org_ledger()"),
    q("select org_id, type, amount, created_at from public.billing_record"),
    one("select count(*)::int as total from public.student where status = 'active'"),
    one("select count(*)::int as total from public.parent_account where last_login_at >= $1::timestamptz", [bounds.dayStart])
  ]);
  const revenue = bills.reduce((sum, row) => {
    const at = new Date(row.created_at).getTime();
    if (row.type === "\u8BD5\u7528" || Number.isNaN(at) || at < bounds.monthStart || at >= bounds.nextMonth) return sum;
    return sum + Number(row.amount);
  }, 0);
  const purchased = new Set(bills.filter((row) => row.type === "\u65B0\u8D2D").map((row) => row.org_id));
  const trialed = new Set(bills.filter((row) => row.type === "\u8BD5\u7528").map((row) => row.org_id));
  for (const row of orgs) {
    if (row.trial_expire_at) trialed.add(row.id);
  }
  let converted = 0;
  for (const id of trialed) {
    const row = orgs.find((item) => item.id === id);
    if (purchased.has(id) || row?.status === "active") converted += 1;
  }
  const expiringOrgs = orgs.filter((row) => row.expiring_soon).map((row) => ({
    id: row.id,
    name: row.name,
    daysLeft: daysUntil(row.service_end_at ?? row.trial_expire_at, now),
    contactPhone: row.contact_phone
  })).sort((a, b) => a.daysLeft - b.daysLeft);
  const seatAlerts = orgs.filter((row) => row.seat_quota > 0 && row.used_seats / row.seat_quota >= 0.9).map((row) => ({
    id: row.id,
    name: row.name,
    usedSeats: row.used_seats,
    seatQuota: row.seat_quota
  })).sort((a, b) => b.usedSeats / b.seatQuota - a.usedSeats / a.seatQuota);
  return ok({
    revenue,
    activeStudents: Number(students?.total ?? 0),
    activeParentsToday: Number(parents?.total ?? 0),
    conversionRate: trialed.size ? Math.round(converted / trialed.size * 100) : 0,
    expiringOrgs,
    seatAlerts
  });
}
async function requireStaff(req, roles) {
  const auth = await requireRole(req, "platform");
  if ("status" in auth) return auth.status === 401 ? fail(401, "\u9700\u8981\u5E73\u53F0\u8FD0\u8425\u6743\u9650") : auth;
  const staff = await one(
    "select id, display_name, role, status from public.platform_staff where id = $1",
    [auth.subjectId]
  );
  if (!staff || staff.status !== "active" || !roles.includes(staff.role)) return fail(403, "\u9700\u8981\u5E73\u53F0\u8FD0\u8425\u6743\u9650");
  return { id: staff.id, displayName: staff.display_name, role: staff.role };
}
var ORG_STATUS_LABEL = {
  trial: "\u8BD5\u7528\u4E2D",
  active: "\u6B63\u5E38",
  expired: "\u5DF2\u5230\u671F",
  disabled: "\u505C\u7528"
};
function provisionSummary(action, detail) {
  if (action === "\u5F00\u6237") return `\u8BD5\u7528 ${detail.trialDays ?? "\u2014"} \u5929\uFF0C\u5E2D\u4F4D ${detail.seatQuota ?? "\u2014"}`;
  if (action === "\u7EED\u8D39") return `${detail.type ?? "\u7EED\u8D39"} \xB7 ${detail.seats ?? "\u2014"} \u5E2D \xB7 \xA5${detail.amount ?? "\u2014"}`;
  if (action === "\u505C\u7528") return `\u505C\u7528\u524D\u4E3A${ORG_STATUS_LABEL[String(detail.previousStatus)] ?? "\u539F\u72B6\u6001"}`;
  if (action === "\u6062\u590D") return `\u6062\u590D\u4E3A${ORG_STATUS_LABEL[String(detail.status)] ?? "\u53EF\u767B\u5F55"}`;
  return "";
}
function jsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}
async function orgDetail(req) {
  const orgId = typeof req.body.orgId === "string" ? req.body.orgId.trim() : "";
  if (!STUDENT_UUID.test(orgId)) return fail(404, "\u673A\u6784\u4E0D\u5B58\u5728");
  const org = await one(
    `select id, org_no, name, contact_name, contact_phone, campus, seat_quota, used_seats, status, trial_expire_at, service_end_at
     from public.org where id = $1`,
    [orgId]
  );
  if (!org) return fail(404, "\u673A\u6784\u4E0D\u5B58\u5728");
  const [statusRow, students, parents, logs] = await Promise.all([
    one("select public.effective_org_status($1, $2, $3) as status", [org.status, org.trial_expire_at, org.service_end_at]),
    one("select count(*)::int as total from public.student where org_id = $1 and status = 'active'", [orgId]),
    one(
      `select count(distinct b.parent_account_id)::int as total
       from public.parent_binding b
       join public.student s on s.id = b.student_id
       join public.parent_account a on a.id = b.parent_account_id
       where s.org_id = $1 and b.revoked_at is null and a.anonymized_at is null`,
      [orgId]
    ),
    q(
      "select id, action, operator, detail, created_at from public.provision_log where org_id = $1 order by created_at desc",
      [orgId]
    )
  ]);
  return ok({
    org: {
      id: org.id,
      orgNo: org.org_no,
      name: org.name,
      contactName: org.contact_name,
      contactPhone: org.contact_phone,
      campus: org.campus,
      seatQuota: org.seat_quota,
      usedSeats: org.used_seats,
      activeStudents: Number(students?.total ?? 0),
      boundParents: Number(parents?.total ?? 0),
      trialExpireAt: org.trial_expire_at,
      serviceEndAt: org.service_end_at,
      status: statusRow?.status ?? org.status
    },
    logs: logs.map((row) => ({
      id: row.id,
      action: row.action,
      operator: row.operator,
      summary: provisionSummary(row.action, jsonObject(row.detail)),
      createdAt: row.created_at
    }))
  });
}
async function adminOps(req) {
  const action = typeof req.body.action === "string" ? req.body.action : "ledger";
  const financeOk = action === "ledger" || action === "overview" || action === "billing" || action === "invoice" || action === "quote" || action === "detail";
  const staff = await requireStaff(req, financeOk ? ["ops", "finance"] : ["ops"]);
  if ("status" in staff) return staff;
  const known = ["\u8BB0\u5F55\u7C7B\u578B", "\u5E2D\u4F4D\u6570", "\u673A\u6784\u4E0D\u5B58\u5728", "\u8BD5\u7528\u8BB0\u5F55", "\u624B\u5DE5\u6539\u4EF7", "\u91D1\u989D", "\u8BF7\u586B\u5199\u670D\u52A1\u671F", "\u5F00\u7968\u72B6\u6001", "\u6536\u8D39\u8BB0\u5F55", "\u53EA\u80FD\u505C\u7528", "\u7EBF\u7D22\u4E0D\u5B58\u5728", "\u8FD9\u4E2A\u72B6\u6001"];
  if (action === "quote") {
    try {
      const row = await one("select * from public.quote_seat_price($1)", [Number(req.body.seats)]);
      return ok({ unitPrice: row?.unit_price, amount: row?.amount, plan: row?.plan_label });
    } catch (error) {
      return friendly(error, known, "\u64CD\u4F5C\u5931\u8D25");
    }
  }
  if (action === "detail") return await orgDetail(req);
  if (action === "billing") {
    const orgId = typeof req.body.orgId === "string" ? req.body.orgId : "";
    if (req.body.record && typeof req.body.record === "object") {
      const record = req.body.record;
      try {
        const created = await one("select public.record_billing($1,$2,$3,$4,$5,$6,$7,$8,$9) as id", [
          orgId,
          record.type,
          Number(record.seats),
          Number(record.amount),
          Boolean(record.overridden),
          typeof record.note === "string" ? record.note : "",
          record.serviceStart || null,
          record.serviceEnd || null,
          staff.id
        ]);
        return ok({ id: created?.id });
      } catch (error) {
        return friendly(error, known, "\u64CD\u4F5C\u5931\u8D25");
      }
    }
    const records = await q(
      "select id, type, plan, seats, amount, amount_overridden, note, pay_method, service_start, service_end, invoice_status, renew_remind_at, operator, created_at from public.billing_record where org_id = $1 order by created_at desc",
      [orgId]
    );
    return ok({ records });
  }
  if (action === "invoice") {
    try {
      await q("select public.set_invoice_status($1, $2, $3)", [req.body.recordId, req.body.invoiceStatus, staff.id]);
      return ok({ ok: true });
    } catch (error) {
      return friendly(error, known, "\u64CD\u4F5C\u5931\u8D25");
    }
  }
  if (action === "status") {
    try {
      await q("select public.set_org_manual_status($1, $2, $3)", [req.body.orgId, req.body.manualAction, staff.id]);
      return ok({ ok: true });
    } catch (error) {
      return friendly(error, known, "\u64CD\u4F5C\u5931\u8D25");
    }
  }
  if (action === "leads") {
    if (typeof req.body.leadId === "string" && typeof req.body.status === "string") {
      try {
        await q("select public.set_lead_status($1, $2, $3)", [req.body.leadId, req.body.status, staff.id]);
      } catch (error) {
        return friendly(error, known, "\u64CD\u4F5C\u5931\u8D25");
      }
    }
    const leads = await q("select id, org_name, contact, phone, city, est_students, note, status, org_id, created_at from public.lead order by created_at desc");
    return ok({ leads });
  }
  if (action === "overview") {
    const orgs = await q("select * from public.list_org_ledger()");
    const bills = await q("select amount, type, created_at, org_id from public.billing_record");
    const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const collected = bills.filter((row) => String(row.created_at).slice(0, 7) === month && row.type !== "\u8BD5\u7528").reduce((sum, row) => sum + Number(row.amount), 0);
    const converted = new Set(bills.filter((row) => row.type === "\u65B0\u8D2D").map((row) => row.org_id)).size;
    return ok({
      renewing: orgs.filter((row) => row.expiring_soon).length,
      conversion: orgs.length ? Math.round(converted / orgs.length * 100) : 0,
      newOrgs: orgs.filter((row) => String(row.created_at).slice(0, 7) === month).length,
      collected
    });
  }
  await q("select public.rewrite_org_status_for_display()");
  const data = await q("select * from public.list_org_ledger()");
  const status = typeof req.body.status === "string" ? req.body.status : "all";
  const keyword = typeof req.body.keyword === "string" ? req.body.keyword.trim().toLowerCase() : "";
  const expireFrom = typeof req.body.expireFrom === "string" ? req.body.expireFrom : "";
  const expireTo = typeof req.body.expireTo === "string" ? req.body.expireTo : "";
  const rows = data.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (keyword && !`${row.name} ${row.org_no} ${row.contact_phone}`.toLowerCase().includes(keyword)) return false;
    const end = String(row.service_end_at ?? row.trial_expire_at ?? "").slice(0, 10);
    if (expireFrom && end && end < expireFrom) return false;
    if (expireTo && end && end > expireTo) return false;
    return true;
  });
  return ok({
    operator: staff.displayName,
    role: staff.role,
    orgs: rows.map((row) => ({
      id: row.id,
      orgNo: row.org_no,
      name: row.name,
      contactPhone: row.contact_phone,
      campus: row.campus,
      seatQuota: row.seat_quota,
      usedSeats: row.used_seats,
      createdAt: row.created_at,
      trialExpireAt: row.trial_expire_at,
      serviceEndAt: row.service_end_at,
      status: row.status,
      expiringSoon: row.expiring_soon
    }))
  });
}
async function provisionOrg(req) {
  const staff = await requireStaff(req, ["ops"]);
  if ("status" in staff) return staff;
  const leadRaw = typeof req.body.leadId === "string" ? req.body.leadId.trim() : "";
  const leadId = leadRaw.length > 0 ? leadRaw : null;
  if (leadId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId)) {
    return fail(400, "\u7EBF\u7D22\u4E0D\u5B58\u5728");
  }
  const trialDays = req.body.trialDays == null || req.body.trialDays === "" ? 14 : Number(req.body.trialDays);
  const plain = generateInitialPassword(12);
  try {
    const row = await one("select * from public.provision_org($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
      typeof req.body.name === "string" ? req.body.name : "",
      typeof req.body.contactName === "string" ? req.body.contactName : "",
      typeof req.body.contactPhone === "string" ? req.body.contactPhone : "",
      typeof req.body.campus === "string" ? req.body.campus : "",
      Number(req.body.seatQuota),
      trialDays,
      await hashPassword(plain),
      leadId,
      staff.id
    ]);
    if (!row?.org_no || !row.admin_account) return fail(500, "\u5F00\u6237\u5931\u8D25");
    return ok({ orgNo: row.org_no, adminAccount: row.admin_account, initialPassword: plain });
  } catch (error) {
    return friendly(
      error,
      ["\u673A\u6784\u540D\u79F0\u9700\u8981", "\u8054\u7CFB\u4EBA\u9700\u8981", "\u8BF7\u586B\u5199 11 \u4F4D\u624B\u673A\u53F7", "\u8BF7\u586B\u5199\u6821\u533A", "\u8BD5\u7528\u5929\u6570\u9700\u8981", "\u5E2D\u4F4D\u989D\u5EA6\u81F3\u5C11\u4E3A", "\u8BD5\u7528\u673A\u6784\u6700\u591A", "\u7EBF\u7D22\u4E0D\u5B58\u5728", "\u8BE5\u7EBF\u7D22\u5DF2\u5F00\u6237", "\u8BE5\u7EBF\u7D22\u4E0D\u80FD\u5F00\u6237", "\u5BC6\u7801\u54C8\u5E0C\u65E0\u6548"],
      "\u5F00\u6237\u5931\u8D25"
    );
  }
}
async function courseCatalog(req) {
  const staff = await requireStaff(req, ["ops"]);
  if ("status" in staff) return staff;
  const action = typeof req.body.action === "string" ? req.body.action : "list";
  if (action === "validate" || action === "import") {
    const text = typeof req.body.text === "string" ? req.body.text : "";
    const { report, levels: levels2 } = validateCoursePackage(text);
    if (action === "import" && report.ok) {
      for (const level of levels2) {
        await q(
          `insert into public.course_level (level_id, sort_order, title, goal, body, published, updated_at)
           values ($1, $2, $3, $4, $5::jsonb, true, now())
           on conflict (level_id) do update set sort_order = excluded.sort_order, title = excluded.title, goal = excluded.goal, body = excluded.body, published = true, updated_at = now()`,
          [level.level_id, level.order, level.title, level.goal, JSON.stringify(level)]
        );
      }
    }
    const listed = await q("select level_id, sort_order, title from public.course_level where published = true order by sort_order");
    return ok({ report, levels: listed });
  }
  const levels = await q("select level_id, sort_order, title, goal from public.course_level where published = true order by sort_order");
  return ok({ levels });
}

// server/vercelHandler.ts
var config = { runtime: "nodejs" };
async function handler(req, res) {
  try {
    const result = await dispatch(await readRequest(req));
    return send(res, result.status, result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "\u8BF7\u6C42\u5931\u8D25";
    return send(res, 500, { message: message.slice(0, 180) || "\u8BF7\u6C42\u5931\u8D25" });
  }
}
async function readRequest(req) {
  return {
    method: req.method ?? "GET",
    name: functionName(req),
    header: (key) => headerOf(req, key),
    body: await bodyOf(req)
  };
}
function functionName(req) {
  const queryName = req.query?.name;
  if (Array.isArray(queryName)) return queryName[0] ?? "";
  if (typeof queryName === "string" && queryName) return queryName;
  if (!req.url) return "";
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    return path.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
}
function headerOf(req, key) {
  if (typeof req.headers?.get === "function") return req.headers.get(key);
  const value = req.headers?.[key.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
async function bodyOf(req) {
  if (typeof req.json === "function" && isWebBody(req.body)) {
    try {
      return asRecord(await req.json());
    } catch {
      return {};
    }
  }
  return asRecord(req.body);
}
function isWebBody(body) {
  return body == null || typeof body === "string" || typeof body === "object" && body !== null && "getReader" in body;
}
function asRecord(parsed) {
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && !("getReader" in parsed)) return parsed;
  return {};
}
function send(res, status, body) {
  if (status === 204) {
    if (res && "status" in res && typeof res.status === "function") {
      res.status(204).end();
      return;
    }
    if (res && "writeHead" in res) {
      res.writeHead(204, {});
      res.end();
      return;
    }
    return new Response(null, { status: 204 });
  }
  const payload = body ?? {};
  if (res && "status" in res && typeof res.status === "function") {
    res.status(status).json(payload);
    return;
  }
  const json = JSON.stringify(payload);
  if (res && "writeHead" in res) {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(json);
    return;
  }
  return new Response(json, { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
export {
  config,
  handler as default
};
