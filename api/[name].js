/* Generated from server/vercelHandler.ts. Do not edit. */

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

// supabase/functions/_shared/typingScore.ts
function normalizeTypingScore(wpm, accuracy) {
  if (typeof wpm !== "number" || typeof accuracy !== "number") return null;
  if (!Number.isFinite(wpm) || !Number.isFinite(accuracy)) return null;
  const wpmRounded = Math.round(wpm * 10) / 10;
  const accuracyRounded = Math.round(accuracy);
  if (wpmRounded <= 0 || accuracyRounded <= 0 || accuracyRounded > 100) return null;
  return { wpm: wpmRounded, accuracy: accuracyRounded };
}

// supabase/functions/_shared/coursePackage.ts
var LEGACY_STAGE_ROW = ["G3-fall", "G3-spring", "G4-fall", "G4-spring", "G5-fall", "G5-spring", "G2-fall", "G2-spring"];
function readBlankLines(value) {
  if (!Array.isArray(value)) return void 0;
  const groups = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item;
    if (typeof row.line !== "number" || !Array.isArray(row.blanks)) continue;
    const blanks = row.blanks.flatMap((blank) => {
      if (!blank || typeof blank !== "object") return [];
      const span = blank;
      if (typeof span.start !== "number" || typeof span.end !== "number" || typeof span.answer !== "string") return [];
      return [{ start: span.start, end: span.end, answer: span.answer }];
    });
    if (blanks.length) groups.push({ line: row.line, blanks });
  }
  return groups;
}
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function readId(value) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(id) ? id : null;
}
function readPedagogy(value) {
  return value === "new" || value === "practice" || value === "project" || value === "typing" ? value : null;
}
function readExercise(explicit, legacy) {
  if (explicit === "fill_blank" || explicit === "debug" || explicit === "normal") return explicit;
  if (legacy === "fill_blank" || legacy === "debug") return legacy;
  return "normal";
}
function readTags(value) {
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string" || !tag.trim())) return null;
  return value.map((tag) => tag.trim());
}
function readCopy(value, field, push) {
  if (value === void 0) return void 0;
  if (value === null) return null;
  if (typeof value !== "string") {
    push(field, `${field} \u9700\u8981\u662F\u6587\u5B57\uFF0C\u6CA1\u6709\u5C31\u4E0D\u8981\u5199\u8FD9\u4E2A\u5B57\u6BB5`);
    return void 0;
  }
  const text = value.trim();
  return text.length ? text : null;
}
function readPlacement(parsed, issues) {
  if (!isRecord(parsed) || !("stage_level" in parsed) && !("stage" in parsed) && !("unit" in parsed)) return null;
  const stage = isRecord(parsed.stage) ? parsed.stage : null;
  const unit = isRecord(parsed.unit) ? parsed.unit : null;
  const push = (field, message) => issues.push({ levelId: "-", field, message, severity: "error" });
  const stageLevel = typeof parsed.stage_level === "number" ? parsed.stage_level : stage && typeof stage.sort_order === "number" ? stage.sort_order : null;
  if (stageLevel == null || !Number.isInteger(stageLevel) || stageLevel < 1 || stageLevel > 8) push("stage_level", "stage_level \u53D6 1 \u5230 8");
  if (!unit) push("unit", "\u8BFE\u7A0B\u5305\u9700\u8981 unit");
  const unitId = unit ? readId(unit.unit_id) : null;
  if (unit && !unitId) push("unit.unit_id", "unit_id \u7528\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u77ED\u6A2A\u7EBF\u6216\u4E0B\u5212\u7EBF");
  if (unit && (typeof unit.title !== "string" || !unit.title.trim())) push("unit.title", "\u7F3A\u5C11\u5355\u5143\u540D\u79F0");
  if (unit && (typeof unit.sort_order !== "number" || unit.sort_order < 1)) push("unit.sort_order", "\u5355\u5143 sort_order \u4ECE 1 \u5F00\u59CB");
  if (stageLevel == null || stageLevel < 1 || stageLevel > 8 || !unit || !unitId) return null;
  if (typeof unit.title !== "string" || typeof unit.sort_order !== "number") return null;
  const legacySemesterId = LEGACY_STAGE_ROW[stageLevel - 1];
  if (!legacySemesterId) return null;
  const title = stage && typeof stage.title === "string" && stage.title.trim() ? stage.title.trim() : `Level ${stageLevel}`;
  return {
    stageLevel,
    stage: { stage_id: `L${stageLevel}`, title, sort_order: stageLevel },
    unit: { unit_id: unitId, title: unit.title.trim(), sort_order: unit.sort_order },
    legacySemesterId
  };
}
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
      levels: [],
      placement: null
    };
  }
  const placement = readPlacement(parsed, issues);
  const rawLevels = asArray(parsed);
  if (!rawLevels.length) {
    return {
      report: {
        ok: false,
        imported: 0,
        skipped: 0,
        issues: [{ levelId: "-", field: "\u6839\u8282\u70B9", message: "\u9700\u8981\u662F\u4E00\u4E2A\u6570\u7EC4\uFF0C\u6216\u5305\u542B levels \u6570\u7EC4\u7684\u5BF9\u8C61\u3002", severity: "error" }]
      },
      levels: [],
      placement: null
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
    const pedagogy = readPedagogy(raw.level_type);
    const levelType = readExercise(raw.exercise, raw.level_type);
    const tags = raw.knowledge_tags === void 0 ? void 0 : readTags(raw.knowledge_tags);
    if (raw.knowledge_tags !== void 0 && !tags) push("knowledge_tags", "knowledge_tags \u9700\u8981\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\u6570\u7EC4\uFF0C\u6CA1\u6709\u6807\u7B7E\u5C31\u5199 []");
    if (placement && raw.knowledge_tags === void 0) push("knowledge_tags", "\u5C42\u7EA7\u8BFE\u7A0B\u5305\u91CC\u6BCF\u8282\u8BFE\u90FD\u8981\u5199 knowledge_tags\uFF0C\u6CA1\u6709\u6807\u7B7E\u5C31\u5199 []");
    if (placement && !pedagogy) push("level_type", "\u5C42\u7EA7\u8BFE\u7A0B\u5305\u91CC level_type \u53EA\u80FD\u662F new\u3001practice\u3001project\u3001typing");
    if (placement && raw.milestone_badge !== null && typeof raw.milestone_badge !== "string") {
      push("milestone_badge", "milestone_badge \u4E0D\u9881\u53D1\u5C31\u5199 null\uFF0C\u9881\u53D1\u5C31\u5199\u5FBD\u7AE0\u6807\u8BC6");
    }
    if (typeof raw.milestone_badge === "string" && !raw.milestone_badge.trim()) push("milestone_badge", "\u5FBD\u7AE0\u6807\u8BC6\u4E0D\u80FD\u662F\u7A7A\u5B57\u7B26\u4E32");
    const teachingIntent = readCopy(raw.teaching_intent, "teaching_intent", push);
    const parentBrief = readCopy(raw.parent_brief, "parent_brief", push);
    const teacherGuide = readCopy(raw.teacher_guide, "teacher_guide", push);
    const blankLines = readBlankLines(raw.blank_lines);
    if (levelType === "fill_blank" && (!blankLines || blankLines.length === 0)) {
      push("blank_lines", "fill_blank \u5173\u5361\u9700\u8981 blank_lines\uFF0C\u5199\u660E\u54EA\u51E0\u884C\u8981\u586B\u7A7A");
    }
    if (Array.isArray(raw.teach_code_lines) && raw.teach_code_lines.length > 15) {
      issues.push({
        levelId: label,
        field: "teach_code_lines",
        message: "\u4EE3\u7801\u884C\u6570\u8D85\u8FC7 15 \u884C\uFF0C\u8D85\u51FA 1.0 \u7684\u884C\u6570\u4E0A\u9650\uFF0C\u5EFA\u8BAE\u62C6\u8282\u3002",
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
        demo_code: String(raw.demo_code),
        expected_output: typeof raw.expected_output === "string" ? raw.expected_output : "",
        preview_kind: raw.preview_kind === "text" ? "text" : "turtle",
        level_type: levelType,
        teach_code_lines: raw.teach_code_lines,
        blank_lines: blankLines,
        unfolded_lines: Array.isArray(raw.unfolded_lines) ? raw.unfolded_lines.filter((line) => typeof line === "string") : void 0,
        line_notes: Array.isArray(raw.line_notes) ? raw.line_notes : void 0,
        keywords: raw.keywords,
        challenge_params: raw.challenge_params ?? [],
        error_mappings: raw.error_mappings ?? [],
        quiz,
        estimated_minutes: raw.estimated_minutes,
        is_review: Boolean(raw.is_review),
        pedagogy: pedagogy ?? void 0,
        knowledge_tags: tags ?? void 0,
        milestone_badge: raw.milestone_badge === null ? null : typeof raw.milestone_badge === "string" ? raw.milestone_badge.trim() : void 0,
        unit_id: placement?.unit.unit_id,
        ...teachingIntent !== void 0 ? { teaching_intent: teachingIntent } : {},
        ...parentBrief !== void 0 ? { parent_brief: parentBrief } : {},
        ...teacherGuide !== void 0 ? { teacher_guide: teacherGuide } : {}
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
    levels: valid,
    placement
  };
}

// supabase/functions/_shared/courseTree.ts
var UNIT_ID = /^L[1-8]_U\d{2}$/;
var STAGE_SUBTITLE = ["\u57FA\u7840\u5165\u95E8", "\u6D77\u9F9F\u7ED8\u56FE", "\u5FAA\u73AF\u9B54\u6CD5", "\u6761\u4EF6\u5224\u65AD", "\u6570\u636E\u8FDB\u9636", "\u903B\u8F91\u8FDB\u9636", "\u7EFC\u5408\u9879\u76EE", "\u7B97\u6CD5\u521D\u63A2"];
var COURSE_TREE_SQL = `
select
  u.stage_level,
  u.unit_id,
  u.title as unit_title,
  u.sort_order as unit_sort,
  cl.level_id,
  cl.sort_order,
  cl.title,
  cl.goal,
  cl.level_type,
  cl.knowledge_tags::text as knowledge_tags,
  cl.milestone_badge,
  cl.published,
  cl.preview_frozen,
  cl.teaching_intent,
  cl.parent_brief,
  cl.teacher_guide,
  cl.body->>'preview_kind' as preview_kind,
  cl.body->>'level_type' as exercise,
  cl.body->>'estimated_minutes' as estimated_minutes,
  cl.body->'keywords' as keywords
from public.curriculum_unit u
left join public.course_level cl on cl.unit_id = u.unit_id
where u.unit_id ~ '^L[1-8]_U[0-9]{2}$'
  and u.stage_level between 1 and 8
order by u.stage_level, u.sort_order, cl.sort_order nulls last
`;
function catalogLevelId(sortOrder) {
  return `L${String(sortOrder).padStart(4, "0")}`;
}
function groupCourseTree(rows) {
  const stages = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const stageLevel = asInt(row.stage_level);
    const unitSort = asInt(row.unit_sort);
    if (stageLevel == null || stageLevel < 1 || stageLevel > 8 || !UNIT_ID.test(row.unit_id) || unitSort == null) continue;
    let stage = stages.get(stageLevel);
    if (!stage) {
      stage = {
        stageLevel,
        title: `Level ${stageLevel}`,
        subtitle: STAGE_SUBTITLE[stageLevel - 1] ?? "",
        units: []
      };
      stages.set(stageLevel, stage);
    }
    let unit = stage.units.find((item) => item.unitId === row.unit_id);
    if (!unit) {
      unit = {
        unitId: row.unit_id,
        title: row.unit_title,
        label: `\u5355\u5143 ${unitSort}`,
        sortOrder: unitSort,
        levels: []
      };
      stage.units.push(unit);
    }
    const level = toLevel(row);
    if (level) unit.levels.push(level);
  }
  return [...stages.values()].sort((a, b) => a.stageLevel - b.stageLevel).map((stage) => ({
    ...stage,
    units: stage.units.sort((a, b) => a.sortOrder - b.sortOrder).map((unit) => ({
      ...unit,
      levels: unit.levels.sort((a, b) => a.sortOrder - b.sortOrder)
    }))
  }));
}
function toLevel(row) {
  const sortOrder = asInt(row.sort_order);
  if (!row.level_id || sortOrder == null) return null;
  const levelType = asLevelType(row.level_type);
  return {
    levelId: row.level_id,
    catalogId: catalogLevelId(sortOrder),
    sortOrder,
    title: row.title?.trim() || "\u672A\u547D\u540D\u5173\u5361",
    goal: row.goal?.trim() || "",
    levelType: levelType ?? "new",
    knowledgeTags: readTextArray(row.knowledge_tags),
    milestoneBadge: asText(row.milestone_badge),
    published: row.published === true || row.published === "t" || row.published === "true",
    previewFrozen: row.preview_frozen === true || row.preview_frozen === "t" || row.preview_frozen === "true",
    teachingIntent: asText(row.teaching_intent),
    parentBrief: asText(row.parent_brief),
    teacherGuide: asText(row.teacher_guide),
    keywords: readKeywords(row),
    estimatedMinutes: asMinutes(row.estimated_minutes ?? readBody(row.body)?.estimated_minutes),
    previewKind: asPreview(row.preview_kind ?? readBody(row.body)?.preview_kind),
    exercise: asExercise(row.exercise ?? readBody(row.body)?.level_type)
  };
}
function readBody(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}
function readKeywords(row) {
  if (row.keywords !== void 0 && row.keywords !== null) return readTextArray(row.keywords);
  const body = readBody(row.body);
  return body ? readTextArray(body.keywords) : [];
}
function asInt(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}
function asText(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length ? text : null;
}
function asMinutes(value) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}
function asLevelType(value) {
  return value === "new" || value === "practice" || value === "project" || value === "typing" ? value : null;
}
function asPreview(value) {
  return value === "text" || value === "turtle" ? value : null;
}
function asExercise(value) {
  return value === "normal" || value === "fill_blank" || value === "debug" ? value : null;
}
function readTextArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed || trimmed === "{}") return [];
  if (trimmed.startsWith("[")) {
    try {
      return readTextArray(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];
  const body = trimmed.slice(1, -1);
  const tags = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === '"') {
      if (quoted && body[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      const tag = current.trim();
      if (tag) tags.push(tag);
      current = "";
      continue;
    }
    current += char;
  }
  const last = current.trim();
  if (last) tags.push(last);
  return tags;
}

// supabase/functions/_shared/curriculumPosition.ts
function levelKind(value) {
  if (value === "practice" || value === "project" || value === "typing") return value;
  return "new";
}
function toCurriculumPosition(row) {
  const term = row.semester_term === "spring" ? "spring" : "fall";
  return {
    source: row.source === "progress" ? "progress" : "mock",
    completedCount: Number(row.completed_count) || 0,
    currentOrder: Number(row.current_order) || 1,
    stage: { id: row.stage_id, title: row.stage_title, sortOrder: Number(row.stage_sort) || 0 },
    semester: { id: row.semester_id, title: row.semester_title, term, sortOrder: Number(row.semester_sort) || 0 },
    unit: { id: row.unit_id, title: row.unit_title, sortOrder: Number(row.unit_sort) || 0 },
    level: {
      levelId: row.level_id,
      title: row.level_title,
      sortOrder: Number(row.level_sort) || 0,
      levelType: levelKind(row.level_type),
      knowledgeTags: row.knowledge_tags ?? [],
      milestoneBadge: row.milestone_badge
    }
  };
}

// supabase/functions/_shared/orgStatus.ts
var TRIAL_SEAT_CAP = 10;
var TRIAL_LEVEL_MAX = 3;
var DAY_MS = 24 * 60 * 60 * 1e3;
function seatLimit(org, effective) {
  if (org.status === "trial" || effective === "trial") return Math.min(org.seatQuota, TRIAL_SEAT_CAP);
  return org.seatQuota;
}
var LESSONS_PER_STAGE = 120;
function stageLevelOfOrder(order) {
  if (!Number.isInteger(order) || order < 1) return null;
  return Math.floor((order - 1) / LESSONS_PER_STAGE) + 1;
}
function readStageLevel(value) {
  const stage = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isInteger(stage) || stage < 1) return null;
  return stage;
}
function openMaxLevel(grant, now = /* @__PURE__ */ new Date()) {
  if (!grant || !Number.isInteger(grant.maxLevel) || grant.maxLevel < 1) return 0;
  if (grant.validUntil) {
    const end = new Date(grant.validUntil).getTime();
    if (!Number.isFinite(end) || now.getTime() >= end) return 0;
  }
  return grant.maxLevel;
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
  if (input.stageLevel == null) return { allowed: false, reason: "not_found" };
  if (input.stageLevel > input.maxLevel) return { allowed: false, reason: "course_locked" };
  return { allowed: true, reason: "ok" };
}

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
  if ((dataTypeID === 114 || dataTypeID === 3802) && typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
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
  const orderMatch = /^L(\d+)$/i.exec(canonical);
  const levelOrder = orderMatch ? Number(orderMatch[1]) : null;
  const [entitlements, grant, levelRow] = await Promise.all([
    q("select org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at from public.level_entitlement where org_id = $1", [
      student.org_id
    ]),
    one(
      "select max_level, valid_until from public.org_entitlement where org_id = $1",
      [student.org_id]
    ),
    one(
      `select stage_level
       from public.course_level
       where level_id = $1 or ($2::int is not null and sort_order = $2)
       order by case when level_id = $1 then 0 else 1 end
       limit 1`,
      [canonical, levelOrder]
    )
  ]);
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
  const stageLevel = readStageLevel(levelRow?.stage_level) ?? (levelOrder == null ? null : stageLevelOfOrder(levelOrder));
  const maxLevel = openMaxLevel(grant ? { maxLevel: Number(grant.max_level), validUntil: grant.valid_until } : null);
  return {
    httpStatus: 200,
    levelId: canonical,
    result: decideEnterLevel({ status: statusRow.status, levelOrder, entitled, stageLevel, maxLevel })
  };
}

// src/data/generated/curriculum.json
var curriculum_default = { stages: [{ stageLevel: 1, stageId: "L1", title: "Level 1", subtitle: "\u57FA\u7840\u5165\u95E8", heading: "Level 1" }, { stageLevel: 2, stageId: "L2", title: "Level 2", subtitle: "\u6D77\u9F9F\u7ED8\u56FE", heading: "Level 2" }, { stageLevel: 3, stageId: "L3", title: "Level 3", subtitle: "\u5FAA\u73AF\u9B54\u6CD5", heading: "Level 3" }, { stageLevel: 4, stageId: "L4", title: "Level 4", subtitle: "\u6761\u4EF6\u5224\u65AD", heading: "Level 4" }, { stageLevel: 5, stageId: "L5", title: "Level 5", subtitle: "\u6570\u636E\u8FDB\u9636", heading: "Level 5" }, { stageLevel: 6, stageId: "L6", title: "Level 6", subtitle: "\u903B\u8F91\u8FDB\u9636", heading: "Level 6" }, { stageLevel: 7, stageId: "L7", title: "Level 7", subtitle: "\u7EFC\u5408\u9879\u76EE", heading: "Level 7" }, { stageLevel: 8, stageId: "L8", title: "Level 8", subtitle: "\u7B97\u6CD5\u521D\u63A2", heading: "Level 8" }], units: [{ unitId: "L1_U01", stageLevel: 1, title: "Level 1 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["print", "forward"] }, { unitId: "L1_U02", stageLevel: 1, title: "Level 1 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["variable", "if"] }, { unitId: "L1_U03", stageLevel: 1, title: "Level 1 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["for_loop", "range"] }, { unitId: "L1_U04", stageLevel: 1, title: "Level 1 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["color", "angle"] }, { unitId: "L1_U05", stageLevel: 1, title: "Level 1 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["variable", "for_loop"] }, { unitId: "L1_U06", stageLevel: 1, title: "Level 1 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["for_loop", "nested_loop"] }, { unitId: "L2_U01", stageLevel: 2, title: "Level 2 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["forward", "right"] }, { unitId: "L2_U02", stageLevel: 2, title: "Level 2 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["if", "else"] }, { unitId: "L2_U03", stageLevel: 2, title: "Level 2 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["nested_loop", "for_loop"] }, { unitId: "L2_U04", stageLevel: 2, title: "Level 2 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["function"] }, { unitId: "L2_U05", stageLevel: 2, title: "Level 2 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["angle", "variable"] }, { unitId: "L2_U06", stageLevel: 2, title: "Level 2 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["for_loop", "variable"] }, { unitId: "L3_U01", stageLevel: 3, title: "Level 3 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["while"] }, { unitId: "L3_U02", stageLevel: 3, title: "Level 3 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["list"] }, { unitId: "L3_U03", stageLevel: 3, title: "Level 3 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["list", "for_loop"] }, { unitId: "L3_U04", stageLevel: 3, title: "Level 3 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["string"] }, { unitId: "L3_U05", stageLevel: 3, title: "Level 3 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["dict"] }, { unitId: "L3_U06", stageLevel: 3, title: "Level 3 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["list", "dict"] }, { unitId: "L4_U01", stageLevel: 4, title: "Level 4 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["function"] }, { unitId: "L4_U02", stageLevel: 4, title: "Level 4 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["function", "variable"] }, { unitId: "L4_U03", stageLevel: 4, title: "Level 4 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["string", "list"] }, { unitId: "L4_U04", stageLevel: 4, title: "Level 4 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["dict"] }, { unitId: "L4_U05", stageLevel: 4, title: "Level 4 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["if", "string"] }, { unitId: "L4_U06", stageLevel: 4, title: "Level 4 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["function", "list"] }, { unitId: "L5_U01", stageLevel: 5, title: "Level 5 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["nested_loop", "if"] }, { unitId: "L5_U02", stageLevel: 5, title: "Level 5 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["search", "list"] }, { unitId: "L5_U03", stageLevel: 5, title: "Level 5 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["sort", "list"] }, { unitId: "L5_U04", stageLevel: 5, title: "Level 5 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["class"] }, { unitId: "L5_U05", stageLevel: 5, title: "Level 5 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["if", "while"] }, { unitId: "L5_U06", stageLevel: 5, title: "Level 5 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["while", "if"] }, { unitId: "L6_U01", stageLevel: 6, title: "Level 6 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["while", "if"] }, { unitId: "L6_U02", stageLevel: 6, title: "Level 6 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["list", "while"] }, { unitId: "L6_U03", stageLevel: 6, title: "Level 6 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["function"] }, { unitId: "L6_U04", stageLevel: 6, title: "Level 6 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["class"] }, { unitId: "L6_U05", stageLevel: 6, title: "Level 6 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["if", "function"] }, { unitId: "L6_U06", stageLevel: 6, title: "Level 6 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["function", "class"] }, { unitId: "L7_U01", stageLevel: 7, title: "Level 7 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["keyboard"] }, { unitId: "L7_U02", stageLevel: 7, title: "Level 7 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["sequence"] }, { unitId: "L7_U03", stageLevel: 7, title: "Level 7 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["print"] }, { unitId: "L7_U04", stageLevel: 7, title: "Level 7 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["forward"] }, { unitId: "L7_U05", stageLevel: 7, title: "Level 7 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["for_loop"] }, { unitId: "L7_U06", stageLevel: 7, title: "Level 7 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["print", "forward"] }, { unitId: "L8_U01", stageLevel: 8, title: "Level 8 \xB7 \u5355\u5143 1", sortOrder: 1, knowledgeTags: ["right", "forward"] }, { unitId: "L8_U02", stageLevel: 8, title: "Level 8 \xB7 \u5355\u5143 2", sortOrder: 2, knowledgeTags: ["variable"] }, { unitId: "L8_U03", stageLevel: 8, title: "Level 8 \xB7 \u5355\u5143 3", sortOrder: 3, knowledgeTags: ["if"] }, { unitId: "L8_U04", stageLevel: 8, title: "Level 8 \xB7 \u5355\u5143 4", sortOrder: 4, knowledgeTags: ["print"] }, { unitId: "L8_U05", stageLevel: 8, title: "Level 8 \xB7 \u5355\u5143 5", sortOrder: 5, knowledgeTags: ["for_loop"] }, { unitId: "L8_U06", stageLevel: 8, title: "Level 8 \xB7 \u5355\u5143 6", sortOrder: 6, knowledgeTags: ["for_loop", "variable"] }], levels: [{ levelId: "L0001", order: 1, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "\u8BA9\u7535\u8111\u5F00\u53E3\u8BF4\u8BDD", goal: "\u7528 print \u628A\u4E00\u53E5\u8BDD\u6253\u5370\u51FA\u6765", knowledgeTags: ["print"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L01" }, { levelId: "L0002", order: 2, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "\u6D77\u9F9F\u753B\u7B2C\u4E00\u6761\u7EBF", goal: "\u8BA9\u6D77\u9F9F\u5F80\u524D\u8D70\u3001\u518D\u62D0\u4E2A\u5F2F", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L02" }, { levelId: "L0003", order: 3, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "\u753B\u4E00\u4E2A\u6B63\u65B9\u5F62", goal: "\u91CD\u590D\u300C\u8D70\u4E00\u6BB5\u3001\u8F6C\u4E2A\u5F2F\u300D\u628A\u6B63\u65B9\u5F62\u753B\u51FA\u6765", knowledgeTags: ["forward", "right"], milestoneBadge: "turtle_hello", placeholder: false, is_placeholder: false, legacyLevelId: "L03" }, { levelId: "L0004", order: 4, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "\u7528\u4E00\u4E2A\u53D8\u91CF\u63A7\u5236\u8FB9\u957F", goal: "\u628A\u8FB9\u957F\u88C5\u8FDB\u53D8\u91CF\uFF0C\u6539\u4E00\u5904\u5C31\u5168\u6539", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L04" }, { levelId: "L0005", order: 5, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "\u7EFC\u5408\uFF1A\u753B\u4E00\u4E2A\u53EF\u8C03\u4E09\u89D2\u5F62", goal: "\u53D8\u91CF + \u8F6C\u89D2\uFF0C\u62FC\u51FA\u4E00\u4E2A\u80FD\u6539\u5927\u5C0F\u7684\u4E09\u89D2\u5F62", knowledgeTags: ["variable", "angle"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L05" }, { levelId: "L0006", order: 6, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "\u7528 for \u5FAA\u73AF\uFF0C8 \u884C\u6536\u6210\u5FAA\u73AF", goal: "\u770B\u89C1\u91CD\u590D\u7684 8 \u884C\u600E\u6837\u6536\u6210 for", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L06" }, { levelId: "L0007", order: 7, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "for + range \u753B\u591A\u8FB9\u5F62", goal: "\u6539\u4E00\u4E2A\u6570\u5B57\u5C31\u80FD\u753B\u4E09\u89D2\u5F62\u3001\u4E94\u8FB9\u5F62\u3001\u516B\u8FB9\u5F62", knowledgeTags: ["for_loop", "range"], milestoneBadge: "loop_magic", placeholder: false, is_placeholder: false, legacyLevelId: "L07" }, { levelId: "L0008", order: 8, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "if \u5224\u65AD\uFF0C\u8BA9\u6D77\u9F9F\u81EA\u5DF1\u9009\u989C\u8272", goal: "\u7528 if / else \u8BA9\u7535\u8111\u505A\u4E00\u4E2A\u9009\u62E9", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L08" }, { levelId: "L0009", order: 9, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "\u7EFC\u5408\uFF1A\u5FAA\u73AF\u91CC\u7684 if\uFF0C\u753B\u53CC\u8272\u591A\u8FB9\u5F62", goal: "\u628A\u5FAA\u73AF\u548C\u5224\u65AD\u53E0\u5728\u4E00\u8D77\uFF0C\u753B\u51FA\u4E24\u79CD\u989C\u8272", knowledgeTags: ["if", "for_loop"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L09" }, { levelId: "L0010", order: 10, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "\u53D8\u91CF\u52A0\u4E00\u52A0\uFF0C\u8D8A\u753B\u8D8A\u5927", goal: "\u6BCF\u5FAA\u73AF\u4E00\u6B21\uFF0C\u628A\u957F\u5EA6\u52A0\u4E0A 20", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L10" }, { levelId: "L0011", order: 11, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "\u53D8\u91CF\u7EC4\u5408\uFF0C\u753B\u4E00\u7247\u82B1\u8FB9", goal: "\u628A\u957F\u5EA6\u548C\u89D2\u5EA6\u4E00\u8D77\u7528\u8D77\u6765", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L11" }, { levelId: "L0012", order: 12, stageLevel: 1, unitId: "L1_U01", levelType: "project", title: "\u9636\u6BB5\u6536\u675F\uFF1A\u753B\u4E00\u6735\u5C0F\u661F\u82B1", goal: "\u628A\u5B66\u8FC7\u7684\u5FAA\u73AF\u3001\u989C\u8272\u3001\u53D8\u91CF\u62FC\u6210\u4E00\u4EF6\u4F5C\u54C1", knowledgeTags: ["for_loop", "nested_loop", "variable"], milestoneBadge: "star_flower", placeholder: false, is_placeholder: false, legacyLevelId: "L12" }, { levelId: "L0013", order: 13, stageLevel: 1, unitId: "L1_U01", levelType: "typing", title: "\u628A print \u6253\u51C6\u786E", goal: "\u628A\u6253\u5370\u7528\u8FC7\u7684\u5173\u952E\u8BCD\u518D\u6253\u4E00\u904D", knowledgeTags: ["print"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L13" }, { levelId: "L0014", order: 14, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "\u518D\u7EC3\u4E00\u6B21\u6B63\u65B9\u5F62", goal: "\u7528\u5DF2\u7ECF\u4F1A\u7684\u8D70\u548C\u8F6C\uFF0C\u518D\u753B\u4E00\u4E2A\u6B63\u65B9\u5F62", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L14" }, { levelId: "L0015", order: 15, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "\u628A\u91CD\u590D\u6536\u6210\u5FAA\u73AF", goal: "\u770B\u5230\u56DB\u6761\u8FB9\uFF0C\u5C31\u77E5\u9053\u53EF\u4EE5\u6536\u6210 for", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L15" }, { levelId: "L0016", order: 16, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "\u95EE\u5019\u548C\u6B63\u65B9\u5F62\u653E\u4E00\u8D77", goal: "\u5148 print \u4E00\u53E5\u95EE\u5019\uFF0C\u518D\u753B\u4E00\u4E2A\u6B63\u65B9\u5F62", knowledgeTags: ["print", "forward", "for_loop"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L16" }, { levelId: "L0017", order: 17, stageLevel: 1, unitId: "L1_U01", levelType: "new", title: "\u628A\u95EE\u5019\u88C5\u8FDB\u53D8\u91CF", goal: '\u5199\u4E0B name = "\u4F60\u597D"\uFF0C\u518D\u7528 print(name) \u6253\u5370\u51FA\u6765', knowledgeTags: ["variable", "print"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L17" }, { levelId: "L0018", order: 18, stageLevel: 1, unitId: "L1_U01", levelType: "practice", title: "\u6539\u95EE\u5019\u3001\u6539\u8FB9\u957F", goal: "\u628A\u95EE\u5019\u548C\u8FB9\u957F\u4E24\u4E2A\u53D8\u91CF\u90FD\u6539\u4E00\u6B21\uFF0C\u518D\u8DD1\u4E00\u904D", knowledgeTags: ["variable", "print", "forward"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L18" }, { levelId: "L0019", order: 19, stageLevel: 1, unitId: "L1_U01", levelType: "typing", title: "\u628A\u5B66\u8FC7\u7684\u8BCD\u518D\u6253\u4E00\u904D", goal: "\u628A print\u3001forward\u3001right \u518D\u6253\u51C6\u786E", knowledgeTags: ["print", "forward", "right"], milestoneBadge: null, placeholder: false, is_placeholder: false, legacyLevelId: "L19" }, { levelId: "L0020", order: 20, stageLevel: 1, unitId: "L1_U01", levelType: "project", title: "\u5355\u5143\u4F5C\u54C1\uFF1A\u6D77\u9F9F\u95EE\u5019", goal: "\u7528\u4E00\u53E5\u95EE\u5019\u548C\u4E00\u6761\u6B63\u65B9\u5F62\uFF0C\u505A\u6210\u80FD\u9001\u7ED9\u540C\u5B66\u7684\u5C0F\u4F5C\u54C1", knowledgeTags: ["print", "forward", "for_loop"], milestoneBadge: "first_drawing", placeholder: false, is_placeholder: false, legacyLevelId: "L20" }, { levelId: "L0021", order: 21, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L21" }, { levelId: "L0022", order: 22, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L22" }, { levelId: "L0023", order: 23, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L23" }, { levelId: "L0024", order: 24, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L24" }, { levelId: "L0025", order: 25, stageLevel: 1, unitId: "L1_U02", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L25" }, { levelId: "L0026", order: 26, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L26" }, { levelId: "L0027", order: 27, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L27" }, { levelId: "L0028", order: 28, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L28" }, { levelId: "L0029", order: 29, stageLevel: 1, unitId: "L1_U02", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L29" }, { levelId: "L0030", order: 30, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L30" }, { levelId: "L0031", order: 31, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L31" }, { levelId: "L0032", order: 32, stageLevel: 1, unitId: "L1_U02", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L32" }, { levelId: "L0033", order: 33, stageLevel: 1, unitId: "L1_U02", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L33" }, { levelId: "L0034", order: 34, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L34" }, { levelId: "L0035", order: 35, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L35" }, { levelId: "L0036", order: 36, stageLevel: 1, unitId: "L1_U02", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L36" }, { levelId: "L0037", order: 37, stageLevel: 1, unitId: "L1_U02", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L37" }, { levelId: "L0038", order: 38, stageLevel: 1, unitId: "L1_U02", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L38" }, { levelId: "L0039", order: 39, stageLevel: 1, unitId: "L1_U02", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L39" }, { levelId: "L0040", order: 40, stageLevel: 1, unitId: "L1_U02", levelType: "project", title: "Level 1 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "if"], milestoneBadge: "L1_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: "L40" }, { levelId: "L0041", order: 41, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L41" }, { levelId: "L0042", order: 42, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L42" }, { levelId: "L0043", order: 43, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L43" }, { levelId: "L0044", order: 44, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L44" }, { levelId: "L0045", order: 45, stageLevel: 1, unitId: "L1_U03", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L45" }, { levelId: "L0046", order: 46, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L46" }, { levelId: "L0047", order: 47, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L47" }, { levelId: "L0048", order: 48, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L48" }, { levelId: "L0049", order: 49, stageLevel: 1, unitId: "L1_U03", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L49" }, { levelId: "L0050", order: 50, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L50" }, { levelId: "L0051", order: 51, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L51" }, { levelId: "L0052", order: 52, stageLevel: 1, unitId: "L1_U03", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L52" }, { levelId: "L0053", order: 53, stageLevel: 1, unitId: "L1_U03", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L53" }, { levelId: "L0054", order: 54, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L54" }, { levelId: "L0055", order: 55, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L55" }, { levelId: "L0056", order: 56, stageLevel: 1, unitId: "L1_U03", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L56" }, { levelId: "L0057", order: 57, stageLevel: 1, unitId: "L1_U03", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L57" }, { levelId: "L0058", order: 58, stageLevel: 1, unitId: "L1_U03", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L58" }, { levelId: "L0059", order: 59, stageLevel: 1, unitId: "L1_U03", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: "L59" }, { levelId: "L0060", order: 60, stageLevel: 1, unitId: "L1_U03", levelType: "project", title: "Level 1 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001range\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "range"], milestoneBadge: "L1_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: "L60" }, { levelId: "L0061", order: 61, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0062", order: 62, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0063", order: 63, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0064", order: 64, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0065", order: 65, stageLevel: 1, unitId: "L1_U04", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0066", order: 66, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0067", order: 67, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0068", order: 68, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0069", order: 69, stageLevel: 1, unitId: "L1_U04", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0070", order: 70, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0071", order: 71, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0072", order: 72, stageLevel: 1, unitId: "L1_U04", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0073", order: 73, stageLevel: 1, unitId: "L1_U04", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0074", order: 74, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0075", order: 75, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0076", order: 76, stageLevel: 1, unitId: "L1_U04", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0077", order: 77, stageLevel: 1, unitId: "L1_U04", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0078", order: 78, stageLevel: 1, unitId: "L1_U04", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0079", order: 79, stageLevel: 1, unitId: "L1_U04", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0080", order: 80, stageLevel: 1, unitId: "L1_U04", levelType: "project", title: "Level 1 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089color\u3001angle\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["color", "angle"], milestoneBadge: "L1_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0081", order: 81, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0082", order: 82, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0083", order: 83, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0084", order: 84, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0085", order: 85, stageLevel: 1, unitId: "L1_U05", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0086", order: 86, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0087", order: 87, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0088", order: 88, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0089", order: 89, stageLevel: 1, unitId: "L1_U05", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0090", order: 90, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0091", order: 91, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0092", order: 92, stageLevel: 1, unitId: "L1_U05", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0093", order: 93, stageLevel: 1, unitId: "L1_U05", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0094", order: 94, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0095", order: 95, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0096", order: 96, stageLevel: 1, unitId: "L1_U05", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0097", order: 97, stageLevel: 1, unitId: "L1_U05", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0098", order: 98, stageLevel: 1, unitId: "L1_U05", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0099", order: 99, stageLevel: 1, unitId: "L1_U05", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0100", order: 100, stageLevel: 1, unitId: "L1_U05", levelType: "project", title: "Level 1 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable", "for_loop"], milestoneBadge: "L1_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0101", order: 101, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0102", order: 102, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0103", order: 103, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0104", order: 104, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0105", order: 105, stageLevel: 1, unitId: "L1_U06", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0106", order: 106, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0107", order: 107, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0108", order: 108, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0109", order: 109, stageLevel: 1, unitId: "L1_U06", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0110", order: 110, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0111", order: 111, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0112", order: 112, stageLevel: 1, unitId: "L1_U06", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0113", order: 113, stageLevel: 1, unitId: "L1_U06", levelType: "typing", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0114", order: 114, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0115", order: 115, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0116", order: 116, stageLevel: 1, unitId: "L1_U06", levelType: "new", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0117", order: 117, stageLevel: 1, unitId: "L1_U06", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0118", order: 118, stageLevel: 1, unitId: "L1_U06", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0119", order: 119, stageLevel: 1, unitId: "L1_U06", levelType: "practice", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0120", order: 120, stageLevel: 1, unitId: "L1_U06", levelType: "project", title: "Level 1 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001nested_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "nested_loop"], milestoneBadge: "L1_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0121", order: 121, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0122", order: 122, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0123", order: 123, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0124", order: 124, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0125", order: 125, stageLevel: 2, unitId: "L2_U01", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0126", order: 126, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0127", order: 127, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0128", order: 128, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0129", order: 129, stageLevel: 2, unitId: "L2_U01", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0130", order: 130, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0131", order: 131, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0132", order: 132, stageLevel: 2, unitId: "L2_U01", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0133", order: 133, stageLevel: 2, unitId: "L2_U01", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0134", order: 134, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0135", order: 135, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0136", order: 136, stageLevel: 2, unitId: "L2_U01", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0137", order: 137, stageLevel: 2, unitId: "L2_U01", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0138", order: 138, stageLevel: 2, unitId: "L2_U01", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0139", order: 139, stageLevel: 2, unitId: "L2_U01", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0140", order: 140, stageLevel: 2, unitId: "L2_U01", levelType: "project", title: "Level 2 \xB7 \u5355\u5143 1 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\u3001right\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward", "right"], milestoneBadge: "L2_U01-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0141", order: 141, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0142", order: 142, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0143", order: 143, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0144", order: 144, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0145", order: 145, stageLevel: 2, unitId: "L2_U02", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0146", order: 146, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0147", order: 147, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0148", order: 148, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0149", order: 149, stageLevel: 2, unitId: "L2_U02", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0150", order: 150, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0151", order: 151, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0152", order: 152, stageLevel: 2, unitId: "L2_U02", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0153", order: 153, stageLevel: 2, unitId: "L2_U02", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0154", order: 154, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0155", order: 155, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0156", order: 156, stageLevel: 2, unitId: "L2_U02", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0157", order: 157, stageLevel: 2, unitId: "L2_U02", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0158", order: 158, stageLevel: 2, unitId: "L2_U02", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0159", order: 159, stageLevel: 2, unitId: "L2_U02", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0160", order: 160, stageLevel: 2, unitId: "L2_U02", levelType: "project", title: "Level 2 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001else\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "else"], milestoneBadge: "L2_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0161", order: 161, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0162", order: 162, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0163", order: 163, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0164", order: 164, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0165", order: 165, stageLevel: 2, unitId: "L2_U03", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0166", order: 166, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0167", order: 167, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0168", order: 168, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0169", order: 169, stageLevel: 2, unitId: "L2_U03", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0170", order: 170, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0171", order: 171, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0172", order: 172, stageLevel: 2, unitId: "L2_U03", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0173", order: 173, stageLevel: 2, unitId: "L2_U03", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0174", order: 174, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0175", order: 175, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0176", order: 176, stageLevel: 2, unitId: "L2_U03", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0177", order: 177, stageLevel: 2, unitId: "L2_U03", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0178", order: 178, stageLevel: 2, unitId: "L2_U03", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0179", order: 179, stageLevel: 2, unitId: "L2_U03", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0180", order: 180, stageLevel: 2, unitId: "L2_U03", levelType: "project", title: "Level 2 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "for_loop"], milestoneBadge: "L2_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0181", order: 181, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0182", order: 182, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0183", order: 183, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0184", order: 184, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0185", order: 185, stageLevel: 2, unitId: "L2_U04", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0186", order: 186, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0187", order: 187, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0188", order: 188, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0189", order: 189, stageLevel: 2, unitId: "L2_U04", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0190", order: 190, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0191", order: 191, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0192", order: 192, stageLevel: 2, unitId: "L2_U04", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0193", order: 193, stageLevel: 2, unitId: "L2_U04", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0194", order: 194, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0195", order: 195, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0196", order: 196, stageLevel: 2, unitId: "L2_U04", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0197", order: 197, stageLevel: 2, unitId: "L2_U04", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0198", order: 198, stageLevel: 2, unitId: "L2_U04", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0199", order: 199, stageLevel: 2, unitId: "L2_U04", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0200", order: 200, stageLevel: 2, unitId: "L2_U04", levelType: "project", title: "Level 2 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: "L2_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0201", order: 201, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0202", order: 202, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0203", order: 203, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0204", order: 204, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0205", order: 205, stageLevel: 2, unitId: "L2_U05", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0206", order: 206, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0207", order: 207, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0208", order: 208, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0209", order: 209, stageLevel: 2, unitId: "L2_U05", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0210", order: 210, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0211", order: 211, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0212", order: 212, stageLevel: 2, unitId: "L2_U05", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0213", order: 213, stageLevel: 2, unitId: "L2_U05", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0214", order: 214, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0215", order: 215, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0216", order: 216, stageLevel: 2, unitId: "L2_U05", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0217", order: 217, stageLevel: 2, unitId: "L2_U05", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0218", order: 218, stageLevel: 2, unitId: "L2_U05", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0219", order: 219, stageLevel: 2, unitId: "L2_U05", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0220", order: 220, stageLevel: 2, unitId: "L2_U05", levelType: "project", title: "Level 2 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089angle\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["angle", "variable"], milestoneBadge: "L2_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0221", order: 221, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0222", order: 222, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0223", order: 223, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0224", order: 224, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0225", order: 225, stageLevel: 2, unitId: "L2_U06", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0226", order: 226, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0227", order: 227, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0228", order: 228, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0229", order: 229, stageLevel: 2, unitId: "L2_U06", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0230", order: 230, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0231", order: 231, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0232", order: 232, stageLevel: 2, unitId: "L2_U06", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0233", order: 233, stageLevel: 2, unitId: "L2_U06", levelType: "typing", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0234", order: 234, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0235", order: 235, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0236", order: 236, stageLevel: 2, unitId: "L2_U06", levelType: "new", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0237", order: 237, stageLevel: 2, unitId: "L2_U06", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0238", order: 238, stageLevel: 2, unitId: "L2_U06", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0239", order: 239, stageLevel: 2, unitId: "L2_U06", levelType: "practice", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0240", order: 240, stageLevel: 2, unitId: "L2_U06", levelType: "project", title: "Level 2 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: "L2_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0241", order: 241, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0242", order: 242, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0243", order: 243, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0244", order: 244, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0245", order: 245, stageLevel: 3, unitId: "L3_U01", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0246", order: 246, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0247", order: 247, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0248", order: 248, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0249", order: 249, stageLevel: 3, unitId: "L3_U01", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0250", order: 250, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0251", order: 251, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0252", order: 252, stageLevel: 3, unitId: "L3_U01", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0253", order: 253, stageLevel: 3, unitId: "L3_U01", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0254", order: 254, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0255", order: 255, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0256", order: 256, stageLevel: 3, unitId: "L3_U01", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0257", order: 257, stageLevel: 3, unitId: "L3_U01", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0258", order: 258, stageLevel: 3, unitId: "L3_U01", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0259", order: 259, stageLevel: 3, unitId: "L3_U01", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0260", order: 260, stageLevel: 3, unitId: "L3_U01", levelType: "project", title: "Level 3 \xB7 \u5355\u5143 1 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while"], milestoneBadge: "L3_U01-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0261", order: 261, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0262", order: 262, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0263", order: 263, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0264", order: 264, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0265", order: 265, stageLevel: 3, unitId: "L3_U02", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0266", order: 266, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0267", order: 267, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0268", order: 268, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0269", order: 269, stageLevel: 3, unitId: "L3_U02", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0270", order: 270, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0271", order: 271, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0272", order: 272, stageLevel: 3, unitId: "L3_U02", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0273", order: 273, stageLevel: 3, unitId: "L3_U02", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0274", order: 274, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0275", order: 275, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0276", order: 276, stageLevel: 3, unitId: "L3_U02", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0277", order: 277, stageLevel: 3, unitId: "L3_U02", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0278", order: 278, stageLevel: 3, unitId: "L3_U02", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0279", order: 279, stageLevel: 3, unitId: "L3_U02", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0280", order: 280, stageLevel: 3, unitId: "L3_U02", levelType: "project", title: "Level 3 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list"], milestoneBadge: "L3_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0281", order: 281, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0282", order: 282, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0283", order: 283, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0284", order: 284, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0285", order: 285, stageLevel: 3, unitId: "L3_U03", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0286", order: 286, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0287", order: 287, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0288", order: 288, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0289", order: 289, stageLevel: 3, unitId: "L3_U03", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0290", order: 290, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0291", order: 291, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0292", order: 292, stageLevel: 3, unitId: "L3_U03", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0293", order: 293, stageLevel: 3, unitId: "L3_U03", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0294", order: 294, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0295", order: 295, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0296", order: 296, stageLevel: 3, unitId: "L3_U03", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0297", order: 297, stageLevel: 3, unitId: "L3_U03", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0298", order: 298, stageLevel: 3, unitId: "L3_U03", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0299", order: 299, stageLevel: 3, unitId: "L3_U03", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0300", order: 300, stageLevel: 3, unitId: "L3_U03", levelType: "project", title: "Level 3 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "for_loop"], milestoneBadge: "L3_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0301", order: 301, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0302", order: 302, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0303", order: 303, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0304", order: 304, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0305", order: 305, stageLevel: 3, unitId: "L3_U04", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0306", order: 306, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0307", order: 307, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0308", order: 308, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0309", order: 309, stageLevel: 3, unitId: "L3_U04", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0310", order: 310, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0311", order: 311, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0312", order: 312, stageLevel: 3, unitId: "L3_U04", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0313", order: 313, stageLevel: 3, unitId: "L3_U04", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0314", order: 314, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0315", order: 315, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0316", order: 316, stageLevel: 3, unitId: "L3_U04", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0317", order: 317, stageLevel: 3, unitId: "L3_U04", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0318", order: 318, stageLevel: 3, unitId: "L3_U04", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0319", order: 319, stageLevel: 3, unitId: "L3_U04", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0320", order: 320, stageLevel: 3, unitId: "L3_U04", levelType: "project", title: "Level 3 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string"], milestoneBadge: "L3_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0321", order: 321, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0322", order: 322, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0323", order: 323, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0324", order: 324, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0325", order: 325, stageLevel: 3, unitId: "L3_U05", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0326", order: 326, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0327", order: 327, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0328", order: 328, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0329", order: 329, stageLevel: 3, unitId: "L3_U05", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0330", order: 330, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0331", order: 331, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0332", order: 332, stageLevel: 3, unitId: "L3_U05", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0333", order: 333, stageLevel: 3, unitId: "L3_U05", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0334", order: 334, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0335", order: 335, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0336", order: 336, stageLevel: 3, unitId: "L3_U05", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0337", order: 337, stageLevel: 3, unitId: "L3_U05", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0338", order: 338, stageLevel: 3, unitId: "L3_U05", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0339", order: 339, stageLevel: 3, unitId: "L3_U05", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0340", order: 340, stageLevel: 3, unitId: "L3_U05", levelType: "project", title: "Level 3 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: "L3_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0341", order: 341, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0342", order: 342, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0343", order: 343, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0344", order: 344, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0345", order: 345, stageLevel: 3, unitId: "L3_U06", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0346", order: 346, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0347", order: 347, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0348", order: 348, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0349", order: 349, stageLevel: 3, unitId: "L3_U06", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0350", order: 350, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0351", order: 351, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0352", order: 352, stageLevel: 3, unitId: "L3_U06", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0353", order: 353, stageLevel: 3, unitId: "L3_U06", levelType: "typing", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0354", order: 354, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0355", order: 355, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0356", order: 356, stageLevel: 3, unitId: "L3_U06", levelType: "new", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0357", order: 357, stageLevel: 3, unitId: "L3_U06", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0358", order: 358, stageLevel: 3, unitId: "L3_U06", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0359", order: 359, stageLevel: 3, unitId: "L3_U06", levelType: "practice", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0360", order: 360, stageLevel: 3, unitId: "L3_U06", levelType: "project", title: "Level 3 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "dict"], milestoneBadge: "L3_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0361", order: 361, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0362", order: 362, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0363", order: 363, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0364", order: 364, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0365", order: 365, stageLevel: 4, unitId: "L4_U01", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0366", order: 366, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0367", order: 367, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0368", order: 368, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0369", order: 369, stageLevel: 4, unitId: "L4_U01", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0370", order: 370, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0371", order: 371, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0372", order: 372, stageLevel: 4, unitId: "L4_U01", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0373", order: 373, stageLevel: 4, unitId: "L4_U01", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0374", order: 374, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0375", order: 375, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0376", order: 376, stageLevel: 4, unitId: "L4_U01", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0377", order: 377, stageLevel: 4, unitId: "L4_U01", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0378", order: 378, stageLevel: 4, unitId: "L4_U01", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0379", order: 379, stageLevel: 4, unitId: "L4_U01", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0380", order: 380, stageLevel: 4, unitId: "L4_U01", levelType: "project", title: "Level 4 \xB7 \u5355\u5143 1 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: "L4_U01-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0381", order: 381, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0382", order: 382, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0383", order: 383, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0384", order: 384, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0385", order: 385, stageLevel: 4, unitId: "L4_U02", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0386", order: 386, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0387", order: 387, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0388", order: 388, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0389", order: 389, stageLevel: 4, unitId: "L4_U02", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0390", order: 390, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0391", order: 391, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0392", order: 392, stageLevel: 4, unitId: "L4_U02", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0393", order: 393, stageLevel: 4, unitId: "L4_U02", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0394", order: 394, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0395", order: 395, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0396", order: 396, stageLevel: 4, unitId: "L4_U02", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0397", order: 397, stageLevel: 4, unitId: "L4_U02", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0398", order: 398, stageLevel: 4, unitId: "L4_U02", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0399", order: 399, stageLevel: 4, unitId: "L4_U02", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0400", order: 400, stageLevel: 4, unitId: "L4_U02", levelType: "project", title: "Level 4 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "variable"], milestoneBadge: "L4_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0401", order: 401, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0402", order: 402, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0403", order: 403, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0404", order: 404, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0405", order: 405, stageLevel: 4, unitId: "L4_U03", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0406", order: 406, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0407", order: 407, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0408", order: 408, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0409", order: 409, stageLevel: 4, unitId: "L4_U03", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0410", order: 410, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0411", order: 411, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0412", order: 412, stageLevel: 4, unitId: "L4_U03", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0413", order: 413, stageLevel: 4, unitId: "L4_U03", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0414", order: 414, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0415", order: 415, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0416", order: 416, stageLevel: 4, unitId: "L4_U03", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0417", order: 417, stageLevel: 4, unitId: "L4_U03", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0418", order: 418, stageLevel: 4, unitId: "L4_U03", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0419", order: 419, stageLevel: 4, unitId: "L4_U03", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0420", order: 420, stageLevel: 4, unitId: "L4_U03", levelType: "project", title: "Level 4 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089string\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["string", "list"], milestoneBadge: "L4_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0421", order: 421, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0422", order: 422, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0423", order: 423, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0424", order: 424, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0425", order: 425, stageLevel: 4, unitId: "L4_U04", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0426", order: 426, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0427", order: 427, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0428", order: 428, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0429", order: 429, stageLevel: 4, unitId: "L4_U04", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0430", order: 430, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0431", order: 431, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0432", order: 432, stageLevel: 4, unitId: "L4_U04", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0433", order: 433, stageLevel: 4, unitId: "L4_U04", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0434", order: 434, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0435", order: 435, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0436", order: 436, stageLevel: 4, unitId: "L4_U04", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0437", order: 437, stageLevel: 4, unitId: "L4_U04", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0438", order: 438, stageLevel: 4, unitId: "L4_U04", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0439", order: 439, stageLevel: 4, unitId: "L4_U04", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0440", order: 440, stageLevel: 4, unitId: "L4_U04", levelType: "project", title: "Level 4 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089dict\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["dict"], milestoneBadge: "L4_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0441", order: 441, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0442", order: 442, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0443", order: 443, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0444", order: 444, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0445", order: 445, stageLevel: 4, unitId: "L4_U05", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0446", order: 446, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0447", order: 447, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0448", order: 448, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0449", order: 449, stageLevel: 4, unitId: "L4_U05", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0450", order: 450, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0451", order: 451, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0452", order: 452, stageLevel: 4, unitId: "L4_U05", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0453", order: 453, stageLevel: 4, unitId: "L4_U05", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0454", order: 454, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0455", order: 455, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0456", order: 456, stageLevel: 4, unitId: "L4_U05", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0457", order: 457, stageLevel: 4, unitId: "L4_U05", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0458", order: 458, stageLevel: 4, unitId: "L4_U05", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0459", order: 459, stageLevel: 4, unitId: "L4_U05", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0460", order: 460, stageLevel: 4, unitId: "L4_U05", levelType: "project", title: "Level 4 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001string\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "string"], milestoneBadge: "L4_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0461", order: 461, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0462", order: 462, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0463", order: 463, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0464", order: 464, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0465", order: 465, stageLevel: 4, unitId: "L4_U06", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0466", order: 466, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0467", order: 467, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0468", order: 468, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0469", order: 469, stageLevel: 4, unitId: "L4_U06", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0470", order: 470, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0471", order: 471, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0472", order: 472, stageLevel: 4, unitId: "L4_U06", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0473", order: 473, stageLevel: 4, unitId: "L4_U06", levelType: "typing", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0474", order: 474, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0475", order: 475, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0476", order: 476, stageLevel: 4, unitId: "L4_U06", levelType: "new", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0477", order: 477, stageLevel: 4, unitId: "L4_U06", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0478", order: 478, stageLevel: 4, unitId: "L4_U06", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0479", order: 479, stageLevel: 4, unitId: "L4_U06", levelType: "practice", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0480", order: 480, stageLevel: 4, unitId: "L4_U06", levelType: "project", title: "Level 4 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "list"], milestoneBadge: "L4_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0481", order: 481, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0482", order: 482, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0483", order: 483, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0484", order: 484, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0485", order: 485, stageLevel: 5, unitId: "L5_U01", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0486", order: 486, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0487", order: 487, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0488", order: 488, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0489", order: 489, stageLevel: 5, unitId: "L5_U01", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0490", order: 490, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0491", order: 491, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0492", order: 492, stageLevel: 5, unitId: "L5_U01", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0493", order: 493, stageLevel: 5, unitId: "L5_U01", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0494", order: 494, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0495", order: 495, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0496", order: 496, stageLevel: 5, unitId: "L5_U01", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0497", order: 497, stageLevel: 5, unitId: "L5_U01", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0498", order: 498, stageLevel: 5, unitId: "L5_U01", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0499", order: 499, stageLevel: 5, unitId: "L5_U01", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0500", order: 500, stageLevel: 5, unitId: "L5_U01", levelType: "project", title: "Level 5 \xB7 \u5355\u5143 1 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089nested_loop\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["nested_loop", "if"], milestoneBadge: "L5_U01-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0501", order: 501, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0502", order: 502, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0503", order: 503, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0504", order: 504, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0505", order: 505, stageLevel: 5, unitId: "L5_U02", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0506", order: 506, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0507", order: 507, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0508", order: 508, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0509", order: 509, stageLevel: 5, unitId: "L5_U02", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0510", order: 510, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0511", order: 511, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0512", order: 512, stageLevel: 5, unitId: "L5_U02", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0513", order: 513, stageLevel: 5, unitId: "L5_U02", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0514", order: 514, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0515", order: 515, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0516", order: 516, stageLevel: 5, unitId: "L5_U02", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0517", order: 517, stageLevel: 5, unitId: "L5_U02", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0518", order: 518, stageLevel: 5, unitId: "L5_U02", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0519", order: 519, stageLevel: 5, unitId: "L5_U02", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0520", order: 520, stageLevel: 5, unitId: "L5_U02", levelType: "project", title: "Level 5 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089search\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["search", "list"], milestoneBadge: "L5_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0521", order: 521, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0522", order: 522, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0523", order: 523, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0524", order: 524, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0525", order: 525, stageLevel: 5, unitId: "L5_U03", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0526", order: 526, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0527", order: 527, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0528", order: 528, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0529", order: 529, stageLevel: 5, unitId: "L5_U03", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0530", order: 530, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0531", order: 531, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0532", order: 532, stageLevel: 5, unitId: "L5_U03", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0533", order: 533, stageLevel: 5, unitId: "L5_U03", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0534", order: 534, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0535", order: 535, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0536", order: 536, stageLevel: 5, unitId: "L5_U03", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0537", order: 537, stageLevel: 5, unitId: "L5_U03", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0538", order: 538, stageLevel: 5, unitId: "L5_U03", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0539", order: 539, stageLevel: 5, unitId: "L5_U03", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0540", order: 540, stageLevel: 5, unitId: "L5_U03", levelType: "project", title: "Level 5 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sort\u3001list\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sort", "list"], milestoneBadge: "L5_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0541", order: 541, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0542", order: 542, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0543", order: 543, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0544", order: 544, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0545", order: 545, stageLevel: 5, unitId: "L5_U04", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0546", order: 546, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0547", order: 547, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0548", order: 548, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0549", order: 549, stageLevel: 5, unitId: "L5_U04", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0550", order: 550, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0551", order: 551, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0552", order: 552, stageLevel: 5, unitId: "L5_U04", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0553", order: 553, stageLevel: 5, unitId: "L5_U04", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0554", order: 554, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0555", order: 555, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0556", order: 556, stageLevel: 5, unitId: "L5_U04", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0557", order: 557, stageLevel: 5, unitId: "L5_U04", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0558", order: 558, stageLevel: 5, unitId: "L5_U04", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0559", order: 559, stageLevel: 5, unitId: "L5_U04", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0560", order: 560, stageLevel: 5, unitId: "L5_U04", levelType: "project", title: "Level 5 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: "L5_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0561", order: 561, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0562", order: 562, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0563", order: 563, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0564", order: 564, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0565", order: 565, stageLevel: 5, unitId: "L5_U05", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0566", order: 566, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0567", order: 567, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0568", order: 568, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0569", order: 569, stageLevel: 5, unitId: "L5_U05", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0570", order: 570, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0571", order: 571, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0572", order: 572, stageLevel: 5, unitId: "L5_U05", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0573", order: 573, stageLevel: 5, unitId: "L5_U05", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0574", order: 574, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0575", order: 575, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0576", order: 576, stageLevel: 5, unitId: "L5_U05", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0577", order: 577, stageLevel: 5, unitId: "L5_U05", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0578", order: 578, stageLevel: 5, unitId: "L5_U05", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0579", order: 579, stageLevel: 5, unitId: "L5_U05", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0580", order: 580, stageLevel: 5, unitId: "L5_U05", levelType: "project", title: "Level 5 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "while"], milestoneBadge: "L5_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0581", order: 581, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0582", order: 582, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0583", order: 583, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0584", order: 584, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0585", order: 585, stageLevel: 5, unitId: "L5_U06", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0586", order: 586, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0587", order: 587, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0588", order: 588, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0589", order: 589, stageLevel: 5, unitId: "L5_U06", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0590", order: 590, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0591", order: 591, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0592", order: 592, stageLevel: 5, unitId: "L5_U06", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0593", order: 593, stageLevel: 5, unitId: "L5_U06", levelType: "typing", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0594", order: 594, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0595", order: 595, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0596", order: 596, stageLevel: 5, unitId: "L5_U06", levelType: "new", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0597", order: 597, stageLevel: 5, unitId: "L5_U06", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0598", order: 598, stageLevel: 5, unitId: "L5_U06", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0599", order: 599, stageLevel: 5, unitId: "L5_U06", levelType: "practice", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0600", order: 600, stageLevel: 5, unitId: "L5_U06", levelType: "project", title: "Level 5 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: "L5_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0601", order: 601, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0602", order: 602, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0603", order: 603, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0604", order: 604, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0605", order: 605, stageLevel: 6, unitId: "L6_U01", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0606", order: 606, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0607", order: 607, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0608", order: 608, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0609", order: 609, stageLevel: 6, unitId: "L6_U01", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0610", order: 610, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0611", order: 611, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0612", order: 612, stageLevel: 6, unitId: "L6_U01", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0613", order: 613, stageLevel: 6, unitId: "L6_U01", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0614", order: 614, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0615", order: 615, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0616", order: 616, stageLevel: 6, unitId: "L6_U01", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0617", order: 617, stageLevel: 6, unitId: "L6_U01", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0618", order: 618, stageLevel: 6, unitId: "L6_U01", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0619", order: 619, stageLevel: 6, unitId: "L6_U01", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0620", order: 620, stageLevel: 6, unitId: "L6_U01", levelType: "project", title: "Level 6 \xB7 \u5355\u5143 1 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089while\u3001if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["while", "if"], milestoneBadge: "L6_U01-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0621", order: 621, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0622", order: 622, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0623", order: 623, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0624", order: 624, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0625", order: 625, stageLevel: 6, unitId: "L6_U02", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0626", order: 626, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0627", order: 627, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0628", order: 628, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0629", order: 629, stageLevel: 6, unitId: "L6_U02", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0630", order: 630, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0631", order: 631, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0632", order: 632, stageLevel: 6, unitId: "L6_U02", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0633", order: 633, stageLevel: 6, unitId: "L6_U02", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0634", order: 634, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0635", order: 635, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0636", order: 636, stageLevel: 6, unitId: "L6_U02", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0637", order: 637, stageLevel: 6, unitId: "L6_U02", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0638", order: 638, stageLevel: 6, unitId: "L6_U02", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0639", order: 639, stageLevel: 6, unitId: "L6_U02", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0640", order: 640, stageLevel: 6, unitId: "L6_U02", levelType: "project", title: "Level 6 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089list\u3001while\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["list", "while"], milestoneBadge: "L6_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0641", order: 641, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0642", order: 642, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0643", order: 643, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0644", order: 644, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0645", order: 645, stageLevel: 6, unitId: "L6_U03", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0646", order: 646, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0647", order: 647, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0648", order: 648, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0649", order: 649, stageLevel: 6, unitId: "L6_U03", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0650", order: 650, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0651", order: 651, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0652", order: 652, stageLevel: 6, unitId: "L6_U03", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0653", order: 653, stageLevel: 6, unitId: "L6_U03", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0654", order: 654, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0655", order: 655, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0656", order: 656, stageLevel: 6, unitId: "L6_U03", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0657", order: 657, stageLevel: 6, unitId: "L6_U03", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0658", order: 658, stageLevel: 6, unitId: "L6_U03", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0659", order: 659, stageLevel: 6, unitId: "L6_U03", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0660", order: 660, stageLevel: 6, unitId: "L6_U03", levelType: "project", title: "Level 6 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function"], milestoneBadge: "L6_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0661", order: 661, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0662", order: 662, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0663", order: 663, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0664", order: 664, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0665", order: 665, stageLevel: 6, unitId: "L6_U04", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0666", order: 666, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0667", order: 667, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0668", order: 668, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0669", order: 669, stageLevel: 6, unitId: "L6_U04", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0670", order: 670, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0671", order: 671, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0672", order: 672, stageLevel: 6, unitId: "L6_U04", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0673", order: 673, stageLevel: 6, unitId: "L6_U04", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0674", order: 674, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0675", order: 675, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0676", order: 676, stageLevel: 6, unitId: "L6_U04", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0677", order: 677, stageLevel: 6, unitId: "L6_U04", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0678", order: 678, stageLevel: 6, unitId: "L6_U04", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0679", order: 679, stageLevel: 6, unitId: "L6_U04", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0680", order: 680, stageLevel: 6, unitId: "L6_U04", levelType: "project", title: "Level 6 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["class"], milestoneBadge: "L6_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0681", order: 681, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0682", order: 682, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0683", order: 683, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0684", order: 684, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0685", order: 685, stageLevel: 6, unitId: "L6_U05", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0686", order: 686, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0687", order: 687, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0688", order: 688, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0689", order: 689, stageLevel: 6, unitId: "L6_U05", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0690", order: 690, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0691", order: 691, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0692", order: 692, stageLevel: 6, unitId: "L6_U05", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0693", order: 693, stageLevel: 6, unitId: "L6_U05", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0694", order: 694, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0695", order: 695, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0696", order: 696, stageLevel: 6, unitId: "L6_U05", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0697", order: 697, stageLevel: 6, unitId: "L6_U05", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0698", order: 698, stageLevel: 6, unitId: "L6_U05", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0699", order: 699, stageLevel: 6, unitId: "L6_U05", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0700", order: 700, stageLevel: 6, unitId: "L6_U05", levelType: "project", title: "Level 6 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\u3001function\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if", "function"], milestoneBadge: "L6_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0701", order: 701, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0702", order: 702, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0703", order: 703, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0704", order: 704, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0705", order: 705, stageLevel: 6, unitId: "L6_U06", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0706", order: 706, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0707", order: 707, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0708", order: 708, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0709", order: 709, stageLevel: 6, unitId: "L6_U06", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0710", order: 710, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0711", order: 711, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0712", order: 712, stageLevel: 6, unitId: "L6_U06", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0713", order: 713, stageLevel: 6, unitId: "L6_U06", levelType: "typing", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0714", order: 714, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0715", order: 715, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0716", order: 716, stageLevel: 6, unitId: "L6_U06", levelType: "new", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0717", order: 717, stageLevel: 6, unitId: "L6_U06", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0718", order: 718, stageLevel: 6, unitId: "L6_U06", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0719", order: 719, stageLevel: 6, unitId: "L6_U06", levelType: "practice", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0720", order: 720, stageLevel: 6, unitId: "L6_U06", levelType: "project", title: "Level 6 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089function\u3001class\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["function", "class"], milestoneBadge: "L6_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0721", order: 721, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0722", order: 722, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0723", order: 723, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0724", order: 724, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0725", order: 725, stageLevel: 7, unitId: "L7_U01", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0726", order: 726, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0727", order: 727, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0728", order: 728, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0729", order: 729, stageLevel: 7, unitId: "L7_U01", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0730", order: 730, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0731", order: 731, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0732", order: 732, stageLevel: 7, unitId: "L7_U01", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0733", order: 733, stageLevel: 7, unitId: "L7_U01", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0734", order: 734, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0735", order: 735, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0736", order: 736, stageLevel: 7, unitId: "L7_U01", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0737", order: 737, stageLevel: 7, unitId: "L7_U01", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0738", order: 738, stageLevel: 7, unitId: "L7_U01", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0739", order: 739, stageLevel: 7, unitId: "L7_U01", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0740", order: 740, stageLevel: 7, unitId: "L7_U01", levelType: "project", title: "Level 7 \xB7 \u5355\u5143 1 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089keyboard\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["keyboard"], milestoneBadge: "L7_U01-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0741", order: 741, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0742", order: 742, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0743", order: 743, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0744", order: 744, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0745", order: 745, stageLevel: 7, unitId: "L7_U02", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0746", order: 746, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0747", order: 747, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0748", order: 748, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0749", order: 749, stageLevel: 7, unitId: "L7_U02", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0750", order: 750, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0751", order: 751, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0752", order: 752, stageLevel: 7, unitId: "L7_U02", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0753", order: 753, stageLevel: 7, unitId: "L7_U02", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0754", order: 754, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0755", order: 755, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0756", order: 756, stageLevel: 7, unitId: "L7_U02", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0757", order: 757, stageLevel: 7, unitId: "L7_U02", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0758", order: 758, stageLevel: 7, unitId: "L7_U02", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0759", order: 759, stageLevel: 7, unitId: "L7_U02", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0760", order: 760, stageLevel: 7, unitId: "L7_U02", levelType: "project", title: "Level 7 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089sequence\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["sequence"], milestoneBadge: "L7_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0761", order: 761, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0762", order: 762, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0763", order: 763, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0764", order: 764, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0765", order: 765, stageLevel: 7, unitId: "L7_U03", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0766", order: 766, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0767", order: 767, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0768", order: 768, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0769", order: 769, stageLevel: 7, unitId: "L7_U03", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0770", order: 770, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0771", order: 771, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0772", order: 772, stageLevel: 7, unitId: "L7_U03", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0773", order: 773, stageLevel: 7, unitId: "L7_U03", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0774", order: 774, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0775", order: 775, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0776", order: 776, stageLevel: 7, unitId: "L7_U03", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0777", order: 777, stageLevel: 7, unitId: "L7_U03", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0778", order: 778, stageLevel: 7, unitId: "L7_U03", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0779", order: 779, stageLevel: 7, unitId: "L7_U03", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0780", order: 780, stageLevel: 7, unitId: "L7_U03", levelType: "project", title: "Level 7 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: "L7_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0781", order: 781, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0782", order: 782, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0783", order: 783, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0784", order: 784, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0785", order: 785, stageLevel: 7, unitId: "L7_U04", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0786", order: 786, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0787", order: 787, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0788", order: 788, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0789", order: 789, stageLevel: 7, unitId: "L7_U04", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0790", order: 790, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0791", order: 791, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0792", order: 792, stageLevel: 7, unitId: "L7_U04", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0793", order: 793, stageLevel: 7, unitId: "L7_U04", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0794", order: 794, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0795", order: 795, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0796", order: 796, stageLevel: 7, unitId: "L7_U04", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0797", order: 797, stageLevel: 7, unitId: "L7_U04", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0798", order: 798, stageLevel: 7, unitId: "L7_U04", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0799", order: 799, stageLevel: 7, unitId: "L7_U04", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0800", order: 800, stageLevel: 7, unitId: "L7_U04", levelType: "project", title: "Level 7 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["forward"], milestoneBadge: "L7_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0801", order: 801, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0802", order: 802, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0803", order: 803, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0804", order: 804, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0805", order: 805, stageLevel: 7, unitId: "L7_U05", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0806", order: 806, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0807", order: 807, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0808", order: 808, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0809", order: 809, stageLevel: 7, unitId: "L7_U05", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0810", order: 810, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0811", order: 811, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0812", order: 812, stageLevel: 7, unitId: "L7_U05", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0813", order: 813, stageLevel: 7, unitId: "L7_U05", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0814", order: 814, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0815", order: 815, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0816", order: 816, stageLevel: 7, unitId: "L7_U05", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0817", order: 817, stageLevel: 7, unitId: "L7_U05", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0818", order: 818, stageLevel: 7, unitId: "L7_U05", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0819", order: 819, stageLevel: 7, unitId: "L7_U05", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0820", order: 820, stageLevel: 7, unitId: "L7_U05", levelType: "project", title: "Level 7 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: "L7_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0821", order: 821, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0822", order: 822, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0823", order: 823, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0824", order: 824, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0825", order: 825, stageLevel: 7, unitId: "L7_U06", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0826", order: 826, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0827", order: 827, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0828", order: 828, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0829", order: 829, stageLevel: 7, unitId: "L7_U06", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0830", order: 830, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0831", order: 831, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0832", order: 832, stageLevel: 7, unitId: "L7_U06", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0833", order: 833, stageLevel: 7, unitId: "L7_U06", levelType: "typing", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0834", order: 834, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0835", order: 835, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0836", order: 836, stageLevel: 7, unitId: "L7_U06", levelType: "new", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0837", order: 837, stageLevel: 7, unitId: "L7_U06", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0838", order: 838, stageLevel: 7, unitId: "L7_U06", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0839", order: 839, stageLevel: 7, unitId: "L7_U06", levelType: "practice", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0840", order: 840, stageLevel: 7, unitId: "L7_U06", levelType: "project", title: "Level 7 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print", "forward"], milestoneBadge: "L7_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0841", order: 841, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0842", order: 842, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0843", order: 843, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0844", order: 844, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0845", order: 845, stageLevel: 8, unitId: "L8_U01", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0846", order: 846, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0847", order: 847, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0848", order: 848, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0849", order: 849, stageLevel: 8, unitId: "L8_U01", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0850", order: 850, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0851", order: 851, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0852", order: 852, stageLevel: 8, unitId: "L8_U01", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0853", order: 853, stageLevel: 8, unitId: "L8_U01", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0854", order: 854, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0855", order: 855, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0856", order: 856, stageLevel: 8, unitId: "L8_U01", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0857", order: 857, stageLevel: 8, unitId: "L8_U01", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0858", order: 858, stageLevel: 8, unitId: "L8_U01", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0859", order: 859, stageLevel: 8, unitId: "L8_U01", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0860", order: 860, stageLevel: 8, unitId: "L8_U01", levelType: "project", title: "Level 8 \xB7 \u5355\u5143 1 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089right\u3001forward\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["right", "forward"], milestoneBadge: "L8_U01-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0861", order: 861, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0862", order: 862, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0863", order: 863, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0864", order: 864, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0865", order: 865, stageLevel: 8, unitId: "L8_U02", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0866", order: 866, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0867", order: 867, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0868", order: 868, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0869", order: 869, stageLevel: 8, unitId: "L8_U02", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0870", order: 870, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0871", order: 871, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0872", order: 872, stageLevel: 8, unitId: "L8_U02", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0873", order: 873, stageLevel: 8, unitId: "L8_U02", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0874", order: 874, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0875", order: 875, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0876", order: 876, stageLevel: 8, unitId: "L8_U02", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0877", order: 877, stageLevel: 8, unitId: "L8_U02", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0878", order: 878, stageLevel: 8, unitId: "L8_U02", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0879", order: 879, stageLevel: 8, unitId: "L8_U02", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0880", order: 880, stageLevel: 8, unitId: "L8_U02", levelType: "project", title: "Level 8 \xB7 \u5355\u5143 2 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["variable"], milestoneBadge: "L8_U02-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0881", order: 881, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0882", order: 882, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0883", order: 883, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0884", order: 884, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0885", order: 885, stageLevel: 8, unitId: "L8_U03", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0886", order: 886, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0887", order: 887, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0888", order: 888, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0889", order: 889, stageLevel: 8, unitId: "L8_U03", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0890", order: 890, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0891", order: 891, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0892", order: 892, stageLevel: 8, unitId: "L8_U03", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0893", order: 893, stageLevel: 8, unitId: "L8_U03", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0894", order: 894, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0895", order: 895, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0896", order: 896, stageLevel: 8, unitId: "L8_U03", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0897", order: 897, stageLevel: 8, unitId: "L8_U03", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0898", order: 898, stageLevel: 8, unitId: "L8_U03", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0899", order: 899, stageLevel: 8, unitId: "L8_U03", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0900", order: 900, stageLevel: 8, unitId: "L8_U03", levelType: "project", title: "Level 8 \xB7 \u5355\u5143 3 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089if\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["if"], milestoneBadge: "L8_U03-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0901", order: 901, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0902", order: 902, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0903", order: 903, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0904", order: 904, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0905", order: 905, stageLevel: 8, unitId: "L8_U04", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0906", order: 906, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0907", order: 907, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0908", order: 908, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0909", order: 909, stageLevel: 8, unitId: "L8_U04", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0910", order: 910, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0911", order: 911, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0912", order: 912, stageLevel: 8, unitId: "L8_U04", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0913", order: 913, stageLevel: 8, unitId: "L8_U04", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0914", order: 914, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0915", order: 915, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0916", order: 916, stageLevel: 8, unitId: "L8_U04", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0917", order: 917, stageLevel: 8, unitId: "L8_U04", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0918", order: 918, stageLevel: 8, unitId: "L8_U04", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0919", order: 919, stageLevel: 8, unitId: "L8_U04", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0920", order: 920, stageLevel: 8, unitId: "L8_U04", levelType: "project", title: "Level 8 \xB7 \u5355\u5143 4 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089print\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["print"], milestoneBadge: "L8_U04-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0921", order: 921, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0922", order: 922, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0923", order: 923, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0924", order: 924, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0925", order: 925, stageLevel: 8, unitId: "L8_U05", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0926", order: 926, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0927", order: 927, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0928", order: 928, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0929", order: 929, stageLevel: 8, unitId: "L8_U05", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0930", order: 930, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0931", order: 931, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0932", order: 932, stageLevel: 8, unitId: "L8_U05", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0933", order: 933, stageLevel: 8, unitId: "L8_U05", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0934", order: 934, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0935", order: 935, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0936", order: 936, stageLevel: 8, unitId: "L8_U05", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0937", order: 937, stageLevel: 8, unitId: "L8_U05", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0938", order: 938, stageLevel: 8, unitId: "L8_U05", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0939", order: 939, stageLevel: 8, unitId: "L8_U05", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0940", order: 940, stageLevel: 8, unitId: "L8_U05", levelType: "project", title: "Level 8 \xB7 \u5355\u5143 5 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop"], milestoneBadge: "L8_U05-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0941", order: 941, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 1 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0942", order: 942, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 2 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0943", order: 943, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 3 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0944", order: 944, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 4 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0945", order: 945, stageLevel: 8, unitId: "L8_U06", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 5 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0946", order: 946, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 6 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0947", order: 947, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 7 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0948", order: 948, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 8 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0949", order: 949, stageLevel: 8, unitId: "L8_U06", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 9 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0950", order: 950, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 10 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0951", order: 951, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 11 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0952", order: 952, stageLevel: 8, unitId: "L8_U06", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 12 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0953", order: 953, stageLevel: 8, unitId: "L8_U06", levelType: "typing", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 13 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0954", order: 954, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 14 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0955", order: 955, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 15 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0956", order: 956, stageLevel: 8, unitId: "L8_U06", levelType: "new", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 16 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0957", order: 957, stageLevel: 8, unitId: "L8_U06", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 17 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0958", order: 958, stageLevel: 8, unitId: "L8_U06", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 18 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0959", order: 959, stageLevel: 8, unitId: "L8_U06", levelType: "practice", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 19 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: null, placeholder: true, is_placeholder: true, legacyLevelId: null }, { levelId: "L0960", order: 960, stageLevel: 8, unitId: "L8_U06", levelType: "project", title: "Level 8 \xB7 \u5355\u5143 6 \xB7 \u7B2C 20 \u5173", goal: "\u8FD9\u4E00\u8282\u5148\u719F\u6089for_loop\u3001variable\uFF0C\u8BFE\u6587\u8FD8\u5728\u7F16\u5199\u3002", knowledgeTags: ["for_loop", "variable"], milestoneBadge: "L8_U06-badge", placeholder: true, is_placeholder: true, legacyLevelId: null }], badges: { turtle_hello: "\u521D\u8BC6\u6D77\u9F9F", loop_magic: "\u5FAA\u73AF\u7684\u9B54\u6CD5", star_flower: "\u5C0F\u661F\u82B1", first_drawing: "\u5F00\u53E3\u4E0E\u6D77\u9F9F", "L1_U02-badge": "Level 1 \xB7 \u5355\u5143 2", "L1_U03-badge": "Level 1 \xB7 \u5355\u5143 3", "L1_U04-badge": "Level 1 \xB7 \u5355\u5143 4", "L1_U05-badge": "Level 1 \xB7 \u5355\u5143 5", "L1_U06-badge": "Level 1 \xB7 \u5355\u5143 6", "L2_U01-badge": "Level 2 \xB7 \u5355\u5143 1", "L2_U02-badge": "Level 2 \xB7 \u5355\u5143 2", "L2_U03-badge": "Level 2 \xB7 \u5355\u5143 3", "L2_U04-badge": "Level 2 \xB7 \u5355\u5143 4", "L2_U05-badge": "Level 2 \xB7 \u5355\u5143 5", "L2_U06-badge": "Level 2 \xB7 \u5355\u5143 6", "L3_U01-badge": "Level 3 \xB7 \u5355\u5143 1", "L3_U02-badge": "Level 3 \xB7 \u5355\u5143 2", "L3_U03-badge": "Level 3 \xB7 \u5355\u5143 3", "L3_U04-badge": "Level 3 \xB7 \u5355\u5143 4", "L3_U05-badge": "Level 3 \xB7 \u5355\u5143 5", "L3_U06-badge": "Level 3 \xB7 \u5355\u5143 6", "L4_U01-badge": "Level 4 \xB7 \u5355\u5143 1", "L4_U02-badge": "Level 4 \xB7 \u5355\u5143 2", "L4_U03-badge": "Level 4 \xB7 \u5355\u5143 3", "L4_U04-badge": "Level 4 \xB7 \u5355\u5143 4", "L4_U05-badge": "Level 4 \xB7 \u5355\u5143 5", "L4_U06-badge": "Level 4 \xB7 \u5355\u5143 6", "L5_U01-badge": "Level 5 \xB7 \u5355\u5143 1", "L5_U02-badge": "Level 5 \xB7 \u5355\u5143 2", "L5_U03-badge": "Level 5 \xB7 \u5355\u5143 3", "L5_U04-badge": "Level 5 \xB7 \u5355\u5143 4", "L5_U05-badge": "Level 5 \xB7 \u5355\u5143 5", "L5_U06-badge": "Level 5 \xB7 \u5355\u5143 6", "L6_U01-badge": "Level 6 \xB7 \u5355\u5143 1", "L6_U02-badge": "Level 6 \xB7 \u5355\u5143 2", "L6_U03-badge": "Level 6 \xB7 \u5355\u5143 3", "L6_U04-badge": "Level 6 \xB7 \u5355\u5143 4", "L6_U05-badge": "Level 6 \xB7 \u5355\u5143 5", "L6_U06-badge": "Level 6 \xB7 \u5355\u5143 6", "L7_U01-badge": "Level 7 \xB7 \u5355\u5143 1", "L7_U02-badge": "Level 7 \xB7 \u5355\u5143 2", "L7_U03-badge": "Level 7 \xB7 \u5355\u5143 3", "L7_U04-badge": "Level 7 \xB7 \u5355\u5143 4", "L7_U05-badge": "Level 7 \xB7 \u5355\u5143 5", "L7_U06-badge": "Level 7 \xB7 \u5355\u5143 6", "L8_U01-badge": "Level 8 \xB7 \u5355\u5143 1", "L8_U02-badge": "Level 8 \xB7 \u5355\u5143 2", "L8_U03-badge": "Level 8 \xB7 \u5355\u5143 3", "L8_U04-badge": "Level 8 \xB7 \u5355\u5143 4", "L8_U05-badge": "Level 8 \xB7 \u5355\u5143 5", "L8_U06-badge": "Level 8 \xB7 \u5355\u5143 6" } };

// src/data/fullCurriculum.ts
var catalog = curriculum_default;
var CURRICULUM_STAGES = catalog.stages;
var CURRICULUM_UNITS = catalog.units;
var CURRICULUM_LEVELS = catalog.levels;
var CURRICULUM_BADGES = catalog.badges;
var LEVEL_TOTAL = catalog.levels.length;
var byId = new Map(catalog.levels.map((level) => [level.levelId, level]));
var byOrder = new Map(catalog.levels.map((level) => [level.order, level]));
var unitById = new Map(catalog.units.map((unit) => [unit.unitId, unit]));
var stageByLevel = new Map(catalog.stages.map((stage) => [stage.stageLevel, stage]));
var levelsByUnit = /* @__PURE__ */ new Map();
for (const level of catalog.levels) {
  const list = levelsByUnit.get(level.unitId);
  if (list) list.push(level);
  else levelsByUnit.set(level.unitId, [level]);
}
function curriculumLevelById(levelId) {
  return byId.get(levelId);
}
function curriculumLevelByOrder(order) {
  return byOrder.get(order);
}
function curriculumUnitById(unitId) {
  return unitById.get(unitId);
}
function levelsOfUnit(unitId) {
  return levelsByUnit.get(unitId) ?? [];
}
function unitsOfStage(stageLevel) {
  return catalog.units.filter((unit) => unit.stageLevel === stageLevel).sort((a, b) => a.sortOrder - b.sortOrder);
}
function stageOfOrder(order) {
  const level = byOrder.get(order);
  return level ? stageByLevel.get(level.stageLevel) : catalog.stages[0];
}
function stagesThrough(stageLevel) {
  return catalog.stages.filter((stage) => stage.stageLevel <= stageLevel);
}
function isPlaceholderLevel(level) {
  if (level.is_placeholder === true || level.placeholder === true) return true;
  if (level.is_placeholder === false || level.placeholder === false) return false;
  return level.title.includes("\u5360\u4F4D") || level.title.includes("\u5F85\u8865\u5145") || /^Level \d+ · 单元 \d+ · 第 \d+ 关$/.test(level.title);
}

// src/mock/levels.ts
var baseMappings = [
  {
    pattern: "cjk",
    friendlyMessage: "\u8FD9\u91CC\u7684\u62EC\u53F7\u6216\u9017\u53F7\u662F\u4E2D\u6587\u7684\uFF0CPython \u53EA\u8BA4\u82F1\u6587\u6807\u70B9\uFF0C\u6362\u6210\u82F1\u6587\u8F93\u5165\u6CD5\u518D\u6253\u4E00\u6B21\u3002"
  },
  {
    pattern: "paren",
    friendlyMessage: "\u8FD9\u4E00\u884C\u7684\u62EC\u53F7\u6CA1\u6709\u914D\u5BF9\u4E0A\uFF0C\u6570\u4E00\u6570\u5DE6\u62EC\u53F7\u548C\u53F3\u62EC\u53F7\u662F\u4E0D\u662F\u4E00\u6837\u591A\u3002"
  },
  {
    pattern: "indent",
    friendlyMessage: "\u5192\u53F7\u540E\u9762\u8981\u7F29\u8FDB 4 \u4E2A\u7A7A\u683C\uFF0C\u4E0B\u4E00\u884C\u8981\u5F80\u53F3\u632A\u4E00\u70B9\u3002"
  },
  {
    pattern: "name",
    friendlyMessage: "\u6709\u4E2A\u540D\u5B57\u62FC\u9519\u4E86\uFF0CPython \u4E0D\u8BA4\u8BC6\u5B83\u3002\u5BF9\u7167\u4E0A\u9762\u90A3\u4E00\u884C\u6807\u51C6\u7B54\u6848\u770B\u770B\u3002"
  }
];
var syntaxMappings = [
  {
    pattern: "IndentationError",
    match: "IndentationError",
    friendlyMessage: "Python \u5F88\u770B\u91CD\u7F29\u8FDB\uFF0C\u5FAA\u73AF\u91CC\u9762\u7684\u4EE3\u7801\u8981\u5F80\u53F3\u9000\u4E00\u683C\u54E6\u3002"
  },
  {
    pattern: "expected ':'",
    match: "expected ':'",
    friendlyMessage: "\u8FD9\u884C\u4EE3\u7801\u6700\u540E\u5C11\u4E86\u4E00\u4E2A\u82F1\u6587\u5192\u53F7 ':'\uFF0C\u52A0\u4E0A\u5B83\u8BD5\u8BD5\u3002"
  },
  {
    pattern: "= vs ==",
    match: "= vs ==",
    friendlyMessage: "\u5224\u65AD\u662F\u5426\u76F8\u7B49\u8981\u7528\u4E24\u4E2A\u7B49\u53F7 '==' \u54E6\uFF0C\u4E00\u4E2A\u7B49\u53F7\u662F\u8D4B\u503C\u3002"
  }
];
var m = (extra = []) => [...baseMappings, ...extra];
var teach = (extra = []) => [...syntaxMappings, ...extra, ...baseMappings];
var LEVELS = [
  {
    level_id: "L01",
    order: 1,
    title: "\u8BA9\u7535\u8111\u5F00\u53E3\u8BF4\u8BDD",
    goal: "\u7528 print \u628A\u4E00\u53E5\u8BDD\u6253\u5370\u51FA\u6765",
    level_type: "normal",
    demo_code: 'print("  *  ")\nprint(" *** ")\nprint("*****")',
    expected_output: "\u4E00\u4E2A\u7528\u661F\u53F7\u62FC\u51FA\u6765\u7684\u4E09\u89D2\u5F62",
    preview_kind: "text",
    teach_code_lines: ['print("  *  ")', 'print(" *** ")', 'print("*****")'],
    keywords: ["print", "print()", 'print("")'],
    challenge_params: [
      {
        name: "shape",
        label: "\u628A\u661F\u53F7\u6362\u6210\u522B\u7684\u7B26\u53F7",
        type: "select",
        default: "*",
        options: [
          { value: "*", label: "* \u661F\u53F7" },
          { value: "\u2605", label: "\u2605 \u661F\u661F" },
          { value: "#", label: "# \u4E95\u53F7" },
          { value: "O", label: "O \u5706\u5708" }
        ],
        apply: { kind: "replaceChar", char: "*" },
        hint: "\u4E09\u884C\u7684\u661F\u53F7\u4E00\u8D77\u6362\uFF0C\u56FE\u6848\u4F1A\u50CF\u6362\u4E86\u4E00\u4EF6\u65B0\u8863\u670D\u3002"
      }
    ],
    error_mappings: m(),
    quiz: {
      question: "\u8FD9\u4E09\u884C print \u90FD\u8DD1\u5B8C\uFF0C\u5C4F\u5E55\u4E0A\u4F1A\u51FA\u73B0\u4EC0\u4E48\uFF1F",
      options: ["\u4E00\u4E2A\u4E09\u89D2\u5F62", "\u4E00\u4E2A\u6B63\u65B9\u5F62", "\u53EA\u6709\u4E00\u884C\u5B57"],
      answerIndex: 0,
      explain: "\u4E09\u884C\u661F\u53F7\u4E00\u884C\u6BD4\u4E00\u884C\u591A\uFF0C\u770B\u8D77\u6765\u5C31\u662F\u4E00\u4E2A\u5C0F\u4E09\u89D2\u5F62\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L02",
    order: 2,
    title: "\u6D77\u9F9F\u753B\u7B2C\u4E00\u6761\u7EBF",
    goal: "\u8BA9\u6D77\u9F9F\u5F80\u524D\u8D70\u3001\u518D\u62D0\u4E2A\u5F2F",
    level_type: "normal",
    demo_code: "t.forward(200)\nt.right(90)\nt.forward(120)\nt.done()",
    expected_output: "\u4E00\u6761\u6A2A\u7EBF\u52A0\u4E00\u6761\u7AD6\u7EBF\uFF0C\u50CF\u4E00\u4E2A\u5C0F\u62D0\u89D2",
    preview_kind: "turtle",
    teach_code_lines: ["t.forward(200)", "t.right(90)", "t.forward(120)", "t.done()"],
    keywords: ["t.forward", "t.right", "t.done"],
    challenge_params: [
      {
        name: "long",
        label: "\u628A\u7B2C\u4E00\u6761\u7EBF\u6539\u957F\u4E00\u70B9",
        type: "number",
        min: 100,
        max: 260,
        step: 20,
        default: 200,
        apply: { kind: "arg", func: "forward", argIndex: 0 },
        hint: "\u6570\u5B57\u8D8A\u5927\uFF0C\u7EBF\u8D8A\u957F\u3002"
      },
      {
        name: "turn",
        label: "\u62D0\u5F2F\u7684\u89D2\u5EA6\u4E5F\u6539\u4E00\u6539",
        type: "select",
        default: "90",
        options: [
          { value: "45", label: "45 \u5EA6\uFF08\u62D0\u4E2A\u5C0F\u5F2F\uFF09" },
          { value: "90", label: "90 \u5EA6\uFF08\u76F4\u89D2\uFF09" },
          { value: "120", label: "120 \u5EA6\uFF08\u62D0\u5F97\u66F4\u5927\uFF09" }
        ],
        apply: { kind: "arg", func: "right", argIndex: 0 },
        hint: "\u89D2\u5EA6\u8D8A\u5927\uFF0C\u7B2C\u4E8C\u6761\u7EBF\u62D0\u5F97\u8D8A\u5F00\u3002"
      }
    ],
    error_mappings: m(),
    quiz: {
      question: "t.right(90) \u662F\u8BA9\u6D77\u9F9F\u505A\u4EC0\u4E48\uFF1F",
      options: ["\u5F80\u524D\u8D70 90 \u6B65", "\u5411\u53F3\u8F6C 90 \u5EA6", "\u628A\u7EBF\u53D8\u6210 90 \u5EA6\u90A3\u4E48\u957F"],
      answerIndex: 1,
      explain: "forward \u624D\u662F\u5F80\u524D\u8D70\uFF0Cright(90) \u662F\u539F\u5730\u5411\u53F3\u8F6C 90 \u5EA6\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L03",
    order: 3,
    title: "\u753B\u4E00\u4E2A\u6B63\u65B9\u5F62",
    goal: "\u91CD\u590D\u300C\u8D70\u4E00\u6BB5\u3001\u8F6C\u4E2A\u5F2F\u300D\u628A\u6B63\u65B9\u5F62\u753B\u51FA\u6765",
    level_type: "normal",
    demo_code: "t.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)",
    expected_output: "\u4E00\u4E2A\u6B63\u65B9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: [
      "t.forward(120)",
      "t.right(90)",
      "t.forward(120)",
      "t.right(90)",
      "t.forward(120)",
      "t.right(90)",
      "t.forward(120)",
      "t.right(90)"
    ],
    keywords: ["t.forward", "t.right", "t.right(90)"],
    challenge_params: [
      {
        name: "edge",
        label: "\u628A\u6B63\u65B9\u5F62\u7684\u8FB9\u957F\u6539\u4E00\u6539",
        type: "number",
        min: 60,
        max: 180,
        step: 20,
        default: 120,
        apply: { kind: "arg", func: "forward", argIndex: 0, occurrence: "all" },
        hint: "\u56DB\u6761\u8FB9\u8981\u4E00\u6837\u957F\uFF0C\u6B63\u65B9\u5F62\u624D\u6B63\u3002"
      },
      {
        name: "corner",
        label: "\u518D\u8BD5\u8BD5\u628A 90 \u5EA6\u6539\u6389",
        type: "select",
        default: "90",
        options: [
          { value: "45", label: "45 \u5EA6" },
          { value: "90", label: "90 \u5EA6\uFF08\u76F4\u89D2\uFF09" },
          { value: "120", label: "120 \u5EA6" }
        ],
        apply: { kind: "arg", func: "right", argIndex: 0, occurrence: "all" },
        hint: "\u53EA\u6709 90 \u5EA6\u624D\u65B9\u65B9\u6B63\u6B63\uFF0C\u6539\u6210\u522B\u7684\u89D2\u5C31\u6B6A\u4E86\u3002"
      }
    ],
    error_mappings: m(),
    quiz: {
      question: "\u8981\u753B\u6B63\u65B9\u5F62\uFF0C\u6D77\u9F9F\u6BCF\u6B21\u8F6C\u591A\u5C11\u5EA6\uFF1F",
      options: ["45 \u5EA6", "90 \u5EA6", "180 \u5EA6"],
      answerIndex: 1,
      explain: "\u56DB\u4E2A\u89D2\u52A0\u8D77\u6765\u8981\u8F6C\u4E00\u6574\u5708\uFF0C\u6BCF\u8F6C 90 \u5EA6\uFF0C\u8F6C\u56DB\u6B21\u6B63\u597D\u56DE\u5934\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L04",
    order: 4,
    title: "\u7528\u4E00\u4E2A\u53D8\u91CF\u63A7\u5236\u8FB9\u957F",
    goal: "\u628A\u8FB9\u957F\u88C5\u8FDB\u53D8\u91CF\uFF0C\u6539\u4E00\u5904\u5C31\u5168\u6539",
    level_type: "normal",
    demo_code: "size = 100\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)",
    expected_output: "\u4E00\u4E2A\u8FB9\u957F\u53EF\u4EE5\u8C03\u5927\u8C03\u5C0F\u7684\u6B63\u65B9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: [
      "size = 100",
      "t.forward(size)",
      "t.right(90)",
      "t.forward(size)",
      "t.right(90)",
      "t.forward(size)",
      "t.right(90)",
      "t.forward(size)",
      "t.right(90)"
    ],
    keywords: ["size", "size = 100", "t.forward(size)"],
    challenge_params: [
      {
        name: "size",
        label: "size \u4ECE 100 \u8C03\u5230\u591A\u5C11\uFF1F",
        type: "number",
        min: 50,
        max: 200,
        step: 50,
        default: 100,
        apply: { kind: "assign", variable: "size" },
        hint: "\u53D8\u91CF\u5C31\u50CF\u4E00\u4E2A\u5C0F\u76D2\u5B50\uFF0C\u91CC\u9762\u88C5\u7740\u6B63\u65B9\u5F62\u73B0\u5728\u7684\u5927\u5C0F\u3002"
      },
      {
        name: "corner",
        label: "\u518D\u6539\u6539\u62D0\u5F2F\u7684\u89D2\u5EA6",
        type: "select",
        default: "90",
        options: [
          { value: "45", label: "45 \u5EA6" },
          { value: "90", label: "90 \u5EA6\uFF08\u76F4\u89D2\uFF09" },
          { value: "120", label: "120 \u5EA6" }
        ],
        apply: { kind: "arg", func: "right", argIndex: 0, occurrence: "all" },
        hint: "90 \u5EA6\u624D\u662F\u6B63\u65B9\u5F62\uFF0C\u6539\u6210\u522B\u7684\u89D2\u5C31\u4E0D\u65B9\u4E86\u3002"
      }
    ],
    error_mappings: teach(),
    quiz: {
      question: "\u628A size \u6539\u6210 150\uFF0C\u6B63\u65B9\u5F62\u4F1A\u600E\u6837\uFF1F",
      options: ["\u53D8\u5927\u4E86", "\u53D8\u5C0F\u4E86", "\u6CA1\u6709\u53D8\u5316"],
      answerIndex: 0,
      explain: "\u56DB\u4E2A forward \u90FD\u7528 size\uFF0C\u6539\u4E00\u5904\uFF0C\u56DB\u6761\u8FB9\u4E00\u8D77\u53D8\u957F\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L05",
    order: 5,
    title: "\u7EFC\u5408\uFF1A\u753B\u4E00\u4E2A\u53EF\u8C03\u4E09\u89D2\u5F62",
    goal: "\u53D8\u91CF + \u8F6C\u89D2\uFF0C\u62FC\u51FA\u4E00\u4E2A\u80FD\u6539\u5927\u5C0F\u7684\u4E09\u89D2\u5F62",
    level_type: "fill_blank",
    demo_code: "size = 120\nangle = 120\nt.forward(size)\nt.right(angle)\nt.forward(size)\nt.right(angle)\nt.forward(size)\nt.right(angle)",
    expected_output: "\u4E00\u4E2A\u7B49\u8FB9\u4E09\u89D2\u5F62",
    preview_kind: "turtle",
    teach_code_lines: [
      "size = 120",
      "angle = 120",
      "t.forward(size)",
      "t.right(angle)",
      "t.forward(size)",
      "t.right(angle)",
      "t.forward(size)",
      "t.right(angle)"
    ],
    blank_lines: [
      { line: 0, blanks: [{ start: 7, end: 10, answer: "120" }] },
      { line: 1, blanks: [{ start: 8, end: 11, answer: "120" }] },
      { line: 4, blanks: [{ start: 10, end: 14, answer: "size" }] },
      { line: 5, blanks: [{ start: 8, end: 13, answer: "angle" }] },
      { line: 6, blanks: [{ start: 10, end: 14, answer: "size" }] },
      { line: 7, blanks: [{ start: 8, end: 13, answer: "angle" }] }
    ],
    keywords: ["size", "angle", "t.right(angle)"],
    challenge_params: [
      {
        name: "size",
        label: "\u4E09\u89D2\u5F62\u8FB9\u957F",
        type: "number",
        min: 40,
        max: 200,
        step: 40,
        default: 120,
        apply: { kind: "assign", variable: "size" },
        hint: "\u62D6\u5230\u4E24\u5934\uFF0C\u4E09\u89D2\u5F62\u4F1A\u660E\u663E\u53D8\u5927\u6216\u53D8\u5C0F\u3002"
      },
      {
        name: "angle",
        label: "\u6BCF\u6B21\u8F6C\u591A\u5C11\u5EA6\uFF1F",
        type: "select",
        default: "120",
        options: [
          { value: "120", label: "120 \u5EA6\uFF08\u4E09\u89D2\u5F62\uFF09" },
          { value: "90", label: "90 \u5EA6\uFF08\u62D0\u4E2A\u76F4\u89D2\uFF09" },
          { value: "60", label: "60 \u5EA6\uFF08\u8BD5\u8BD5\u770B\uFF09" }
        ],
        apply: { kind: "assign", variable: "angle" }
      }
    ],
    error_mappings: teach(),
    quiz: {
      question: "\u4E09\u89D2\u5F62\u4E09\u4E2A\u89D2\u4E00\u6837\u5927\uFF0C\u6BCF\u6B21\u5E94\u8BE5\u8F6C\u591A\u5C11\u5EA6\uFF1F",
      options: ["60 \u5EA6", "90 \u5EA6", "120 \u5EA6"],
      answerIndex: 2,
      explain: "\u6D77\u9F9F\u8F6C\u7684\u662F\u300C\u5916\u89D2\u300D\uFF0C\u4E09\u89D2\u5F62\u6BCF\u4E2A\u5916\u89D2\u662F 120 \u5EA6\u3002"
    },
    estimated_minutes: 20,
    is_review: true
  },
  {
    level_id: "L06",
    order: 6,
    title: "\u7528 for \u5FAA\u73AF\uFF0C8 \u884C\u6536\u6210\u5FAA\u73AF",
    goal: "\u770B\u89C1\u91CD\u590D\u7684 8 \u884C\u600E\u6837\u6536\u6210 for",
    level_type: "normal",
    demo_code: "t.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)",
    expected_output: "\u4E00\u4E2A\u6B63\u65B9\u5F62\u30028 \u884C\u91CD\u590D\u548C\u540E\u9762\u7684\u5FAA\u73AF\u753B\u51FA\u7684\u662F\u540C\u4E00\u4E2A\u56FE\u5F62",
    preview_kind: "turtle",
    unfolded_lines: [
      "t.forward(120)",
      "t.right(90)",
      "t.forward(120)",
      "t.right(90)",
      "t.forward(120)",
      "t.right(90)",
      "t.forward(120)",
      "t.right(90)"
    ],
    teach_code_lines: ["for i in range(4):", "    t.forward(120)", "    t.right(90)"],
    keywords: ["for", "in range(4)", "t.forward(120)", "t.right(90)"],
    challenge_params: [
      {
        name: "repeat",
        label: "\u628A range(4) \u6539\u6210\u51E0\uFF1F",
        type: "select",
        default: "4",
        options: [
          { value: "2", label: "2 \u6B21\uFF08\u4E00\u4E2A\u62D0\u89D2\uFF09" },
          { value: "3", label: "3 \u6B21\uFF08\u8FD8\u7F3A\u4E00\u6761\u8FB9\uFF09" },
          { value: "4", label: "4 \u6B21\uFF08\u6B63\u65B9\u5F62\uFF09" }
        ],
        apply: { kind: "arg", func: "range", argIndex: 0 },
        hint: "2 \u6B21\u662F\u62D0\u89D2\uFF0C3 \u6B21\u8FD8\u655E\u7740\u53E3\uFF0C4 \u6B21\u624D\u56F4\u4E0A\u3002"
      },
      {
        name: "edge",
        label: "\u6BCF\u6761\u8FB9\u591A\u957F\uFF1F",
        type: "number",
        min: 40,
        max: 200,
        step: 40,
        default: 120,
        apply: { kind: "arg", func: "forward", argIndex: 0 },
        hint: "\u6570\u5B57\u5DEE\u5F97\u8D8A\u5927\uFF0C\u6B63\u65B9\u5F62\u5DEE\u5F97\u8D8A\u660E\u663E\u3002"
      },
      {
        name: "corner",
        label: "\u6BCF\u6B21\u8F6C\u591A\u5C11\u5EA6\uFF1F",
        type: "select",
        default: "90",
        options: [
          { value: "60", label: "60 \u5EA6" },
          { value: "90", label: "90 \u5EA6\uFF08\u76F4\u89D2\uFF09" },
          { value: "120", label: "120 \u5EA6" }
        ],
        apply: { kind: "arg", func: "right", argIndex: 0 },
        hint: "\u89D2\u5EA6\u4E00\u53D8\uFF0C\u5C31\u4E0D\u518D\u662F\u6B63\u65B9\u5F62\u3002"
      }
    ],
    error_mappings: teach([
      {
        pattern: "indent",
        friendlyMessage: "for \u4E0B\u9762\u7684\u4E24\u884C\u8981\u7F29\u8FDB 4 \u4E2A\u7A7A\u683C\uFF0C\u4E0D\u7136\u5FAA\u73AF\u91CC\u4EC0\u4E48\u90FD\u6CA1\u6709\u3002"
      }
    ]),
    quiz: {
      question: "\u8FD9 8 \u884C\u91CC\uFF0C\u300C\u8D70\u4E00\u6BB5\u3001\u8F6C 90 \u5EA6\u300D\u91CD\u590D\u4E86\u51E0\u6B21\uFF1F",
      options: ["2 \u6B21", "4 \u6B21", "8 \u6B21"],
      answerIndex: 1,
      explain: "\u6BCF\u4E24\u884C\u662F\u4E00\u6B21\uFF0C\u4E00\u5171 4 \u6B21\u3002\u4E0B\u4E00\u56DE\u5408\u628A\u8FD9 4 \u6B21\u6536\u6210 for\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L07",
    order: 7,
    title: "for + range \u753B\u591A\u8FB9\u5F62",
    goal: "\u6539\u4E00\u4E2A\u6570\u5B57\u5C31\u80FD\u753B\u4E09\u89D2\u5F62\u3001\u4E94\u8FB9\u5F62\u3001\u516B\u8FB9\u5F62",
    level_type: "normal",
    demo_code: "sides = 5\nfor i in range(sides):\n    t.forward(80)\n    t.right(360 / sides)",
    expected_output: "\u4E00\u4E2A\u6B63\u4E94\u8FB9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: ["sides = 5", "for i in range(sides):", "    t.forward(80)", "    t.right(360 / sides)"],
    keywords: ["sides", "range(sides)", "360 / sides"],
    challenge_params: [
      {
        name: "sides",
        label: "\u60F3\u753B\u51E0\u8FB9\u5F62\uFF1F",
        type: "select",
        default: "5",
        options: [
          { value: "3", label: "3 \u8FB9\u5F62" },
          { value: "4", label: "4 \u8FB9\u5F62" },
          { value: "5", label: "5 \u8FB9\u5F62" },
          { value: "8", label: "8 \u8FB9\u5F62" }
        ],
        apply: { kind: "assign", variable: "sides" },
        hint: "360 \u9664\u4EE5\u8FB9\u6570\uFF0C\u5C31\u662F\u6BCF\u6B21\u8981\u8F6C\u7684\u89D2\u5EA6\u3002"
      },
      {
        name: "edge",
        label: "\u6BCF\u6761\u8FB9\u591A\u957F\uFF1F",
        type: "number",
        min: 40,
        max: 160,
        step: 40,
        default: 80,
        apply: { kind: "arg", func: "forward", argIndex: 0 },
        hint: "\u8FB9\u8D8A\u957F\uFF0C\u591A\u8FB9\u5F62\u8D8A\u5927\uFF0C\u5F62\u72B6\u4E0D\u53D8\u3002"
      }
    ],
    error_mappings: teach(),
    quiz: {
      question: "\u4E3A\u4EC0\u4E48\u8F6C\u89D2\u662F 360 / sides\uFF1F",
      options: ["\u8F6C\u4E00\u6574\u5708\u6B63\u597D 360 \u5EA6\uFF0C\u8981\u5E73\u5747\u5206\u7ED9\u6BCF\u6761\u8FB9", "\u56E0\u4E3A 360 \u662F\u4E2A\u5409\u5229\u6570\u5B57", "\u6D77\u9F9F\u6700\u591A\u53EA\u80FD\u8F6C 360 \u5EA6"],
      answerIndex: 0,
      explain: "\u8D70\u4E00\u5708\u8981\u8F6C\u6EE1 360 \u5EA6\uFF0C\u51E0\u6761\u8FB9\u5C31\u5E73\u5747\u5206\u6210\u51E0\u4EFD\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L08",
    order: 8,
    title: "if \u5224\u65AD\uFF0C\u8BA9\u6D77\u9F9F\u81EA\u5DF1\u9009\u989C\u8272",
    goal: "\u7528 if / else \u8BA9\u7535\u8111\u505A\u4E00\u4E2A\u9009\u62E9",
    level_type: "normal",
    demo_code: 'sides = 6\nif sides > 5:\n    t.color("teal")\nelse:\n    t.color("orange")\nfor i in range(sides):\n    t.forward(80)\n    t.right(360 / sides)',
    expected_output: "\u516D\u8FB9\u5F62\uFF0C\u5E76\u4E14\u662F\u9752\u8272\u7684",
    preview_kind: "turtle",
    teach_code_lines: [
      "sides = 6",
      "if sides > 5:",
      '    t.color("teal")',
      "else:",
      '    t.color("orange")',
      "for i in range(sides):",
      "    t.forward(80)",
      "    t.right(360 / sides)"
    ],
    keywords: ["if", "else", 't.color("teal")'],
    challenge_params: [
      {
        name: "sides",
        label: "\u628A sides \u6539\u6210\u51E0\uFF1F",
        type: "select",
        default: "6",
        options: [
          { value: "3", label: "3\uFF08\u8D70 else \u5206\u652F\uFF09" },
          { value: "6", label: "6\uFF08\u8D70 if \u5206\u652F\uFF09" }
        ],
        apply: { kind: "assign", variable: "sides" },
        hint: "sides \u53D8\u5C0F\u65F6\uFF0C\u989C\u8272\u4F1A\u6362\u4E00\u79CD\uFF0C\u8BF4\u660E if \u771F\u7684\u5728\u5224\u65AD\u3002"
      },
      {
        name: "edge",
        label: "\u6BCF\u6761\u8FB9\u591A\u957F\uFF1F",
        type: "number",
        min: 40,
        max: 180,
        step: 40,
        default: 80,
        apply: { kind: "arg", func: "forward", argIndex: 0 },
        hint: "\u8FB9\u957F\u53EA\u7BA1\u5927\u5C0F\uFF0C\u62D6\u5230\u4E24\u5934\uFF0C\u56FE\u5F62\u4F1A\u660E\u663E\u53D8\u5927\u6216\u53D8\u5C0F\u3002"
      }
    ],
    error_mappings: teach([
      {
        pattern: "indent",
        friendlyMessage: "if \u548C else \u4E0B\u9762\u7684\u989C\u8272\u90A3\u4E00\u884C\u90FD\u8981\u7F29\u8FDB 4 \u4E2A\u7A7A\u683C\u3002"
      }
    ]),
    quiz: {
      question: "sides \u662F 3 \u7684\u65F6\u5019\uFF0C\u6D77\u9F9F\u4F1A\u662F\u4EC0\u4E48\u989C\u8272\uFF1F",
      options: ["\u9752\u8272", "\u6A59\u8272", "\u6CA1\u6709\u989C\u8272"],
      answerIndex: 1,
      explain: "3 \u4E0D\u5927\u4E8E 5\uFF0Cif \u4E0D\u6210\u7ACB\uFF0C\u5C31\u8D70 else \u90A3\u4E00\u652F\uFF0C\u6D82\u6210\u6A59\u8272\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L09",
    order: 9,
    title: "\u7EFC\u5408\uFF1A\u5FAA\u73AF\u91CC\u7684 if\uFF0C\u753B\u53CC\u8272\u591A\u8FB9\u5F62",
    goal: "\u628A\u5FAA\u73AF\u548C\u5224\u65AD\u53E0\u5728\u4E00\u8D77\uFF0C\u753B\u51FA\u4E24\u79CD\u989C\u8272",
    level_type: "normal",
    demo_code: 'sides = 5\nfor i in range(sides):\n    if i < 2:\n        t.color("teal")\n    else:\n        t.color("orange")\n    t.forward(90)\n    t.right(360 / sides)',
    expected_output: "\u524D\u4E24\u6761\u8FB9\u9752\u8272\u3001\u540E\u9762\u6A59\u8272\u7684\u4E94\u8FB9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: [
      "sides = 5",
      "for i in range(sides):",
      "    if i < 2:",
      '        t.color("teal")',
      "    else:",
      '        t.color("orange")',
      "    t.forward(90)",
      "    t.right(360 / sides)"
    ],
    keywords: ["for", "if", "360 / sides"],
    challenge_params: [
      {
        name: "sides",
        label: "\u628A\u8FB9\u6570\u6539\u6210\u51E0\uFF1F",
        type: "select",
        default: "5",
        options: [
          { value: "3", label: "3 \u8FB9" },
          { value: "5", label: "5 \u8FB9" },
          { value: "6", label: "6 \u8FB9" }
        ],
        apply: { kind: "assign", variable: "sides" }
      },
      {
        name: "edge",
        label: "\u6BCF\u6761\u8FB9\u591A\u957F\uFF1F",
        type: "number",
        min: 40,
        max: 160,
        step: 40,
        default: 90,
        apply: { kind: "arg", func: "forward", argIndex: 0 },
        hint: "\u8FB9\u957F\u53D8\u4E86\uFF0C\u4E24\u4E2A\u989C\u8272\u7167\u6837\u4E00\u6BB5\u4E00\u6BB5\u6392\u7740\u3002"
      }
    ],
    error_mappings: teach([
      {
        pattern: "indent",
        friendlyMessage: "\u8FD9\u91CC\u6709\u4E24\u5C42\u7F29\u8FDB\uFF1Aif \u5728\u5FAA\u73AF\u91CC\u8981\u591A\u7F29\u4E00\u6B21\uFF0C\u989C\u8272\u90A3\u4E00\u884C\u8FD8\u8981\u518D\u7F29\u4E00\u6B21\u3002"
      }
    ]),
    quiz: {
      question: "i \u662F 0\u30011\u30012 \u7684\u65F6\u5019\uFF0C\u5206\u522B\u662F\u4EC0\u4E48\u989C\u8272\uFF1F",
      options: ["\u9752\u3001\u9752\u3001\u6A59", "\u6A59\u3001\u6A59\u3001\u9752", "\u5168\u662F\u9752\u8272"],
      answerIndex: 0,
      explain: "i \u5C0F\u4E8E 2 \u5C31\u662F\u9752\u8272\uFF0C\u4ECE i \u7B49\u4E8E 2 \u5F00\u59CB\u8D70 else\uFF0C\u53D8\u6210\u6A59\u8272\u3002"
    },
    estimated_minutes: 20,
    is_review: true
  },
  {
    level_id: "L10",
    order: 10,
    title: "\u53D8\u91CF\u52A0\u4E00\u52A0\uFF0C\u8D8A\u753B\u8D8A\u5927",
    goal: "\u6BCF\u5FAA\u73AF\u4E00\u6B21\uFF0C\u628A\u957F\u5EA6\u52A0\u4E0A 20",
    level_type: "normal",
    demo_code: "step = 40\nfor i in range(8):\n    t.forward(step)\n    step = step + 20\n    t.right(45)",
    expected_output: "\u4E00\u5708\u6BD4\u4E00\u5708\u957F\u7684\u87BA\u65CB",
    preview_kind: "turtle",
    teach_code_lines: ["step = 40", "for i in range(8):", "    t.forward(step)", "    step = step + 20", "    t.right(45)"],
    keywords: ["step", "step = step + 20", "t.right(45)"],
    challenge_params: [
      {
        name: "step",
        label: "\u7B2C\u4E00\u6B65\u8D70\u591A\u957F\uFF1F",
        type: "number",
        min: 20,
        max: 100,
        step: 40,
        default: 40,
        apply: { kind: "assign", variable: "step" },
        hint: "\u8D77\u70B9\u8D8A\u957F\uFF0C\u6574\u6735\u82B1\u8D8A\u5927\u3002"
      },
      {
        name: "angle",
        label: "\u6BCF\u6B21\u8F6C\u591A\u5C11\u5EA6\uFF1F",
        type: "select",
        default: "45",
        options: [
          { value: "30", label: "30 \u5EA6\uFF08\u87BA\u65CB\u66F4\u7D27\uFF09" },
          { value: "45", label: "45 \u5EA6" },
          { value: "60", label: "60 \u5EA6\uFF08\u87BA\u65CB\u66F4\u677E\uFF09" }
        ],
        apply: { kind: "arg", func: "right", argIndex: 0 },
        hint: "\u89D2\u5EA6\u8D8A\u5C0F\uFF0C\u7EBF\u6761\u6324\u5F97\u8D8A\u7D27\u3002"
      }
    ],
    error_mappings: teach(),
    quiz: {
      question: "\u8FD9 8 \u6761\u7EBF\u4F1A\u4E00\u6837\u957F\u5417\uFF1F",
      options: ["\u4E00\u6837\u957F", "\u4E00\u6761\u6BD4\u4E00\u6761\u957F", "\u4E00\u6761\u6BD4\u4E00\u6761\u77ED"],
      answerIndex: 1,
      explain: "\u6BCF\u8F6C\u4E00\u5708 step \u5C31\u52A0 20\uFF0C\u6240\u4EE5\u8D8A\u8D70\u8D8A\u957F\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L11",
    order: 11,
    title: "\u53D8\u91CF\u7EC4\u5408\uFF0C\u753B\u4E00\u7247\u82B1\u8FB9",
    goal: "\u628A\u957F\u5EA6\u548C\u89D2\u5EA6\u4E00\u8D77\u7528\u8D77\u6765",
    level_type: "normal",
    demo_code: "length = 60\nfor i in range(6):\n    t.forward(length)\n    t.right(60)\n    length = length + 25",
    expected_output: "\u4E00\u7247\u9010\u6E10\u5F20\u5F00\u7684\u82B1\u8FB9",
    preview_kind: "turtle",
    teach_code_lines: ["length = 60", "for i in range(6):", "    t.forward(length)", "    t.right(60)", "    length = length + 25"],
    keywords: ["length", "length = length + 25", "t.right(60)"],
    challenge_params: [
      {
        name: "length",
        label: "\u8D77\u59CB\u957F\u5EA6",
        type: "number",
        min: 30,
        max: 120,
        step: 30,
        default: 60,
        apply: { kind: "assign", variable: "length" }
      },
      {
        name: "angle",
        label: "\u6BCF\u6B21\u8F6C\u591A\u5C11\u5EA6\uFF1F",
        type: "select",
        default: "60",
        options: [
          { value: "45", label: "45 \u5EA6" },
          { value: "60", label: "60 \u5EA6" },
          { value: "90", label: "90 \u5EA6" }
        ],
        apply: { kind: "arg", func: "right", argIndex: 0 },
        hint: "\u89D2\u5EA6\u51B3\u5B9A\u82B1\u8FB9\u5F20\u5F00\u7684\u6837\u5B50\u3002"
      }
    ],
    error_mappings: teach(),
    quiz: {
      question: "\u7B2C\u4E00\u6B21\u5FAA\u73AF\u7ED3\u675F\u65F6\uFF0Clength \u53D8\u6210\u591A\u5C11\uFF1F",
      options: ["60", "85", "25"],
      answerIndex: 1,
      explain: "60 \u52A0\u4E0A 25\uFF0C\u4E0B\u4E00\u6B21\u5FAA\u73AF\u5C31\u7528 85 \u90A3\u4E48\u957F\u3002"
    },
    estimated_minutes: 20
  },
  {
    level_id: "L12",
    order: 12,
    title: "\u9636\u6BB5\u6536\u675F\uFF1A\u753B\u4E00\u6735\u5C0F\u661F\u82B1",
    goal: "\u628A\u5B66\u8FC7\u7684\u5FAA\u73AF\u3001\u989C\u8272\u3001\u53D8\u91CF\u62FC\u6210\u4E00\u4EF6\u4F5C\u54C1",
    level_type: "normal",
    demo_code: 'petals = 6\nsize = 90\nfor i in range(petals):\n    t.color("teal")\n    for j in range(4):\n        t.forward(size)\n        t.right(90)\n    t.right(360 / petals)',
    expected_output: "\u4E00\u6735\u516D\u74E3\u7684\u9752\u8272\u5C0F\u82B1",
    preview_kind: "turtle",
    teach_code_lines: [
      "petals = 6",
      "size = 90",
      "for i in range(petals):",
      '    t.color("teal")',
      "    for j in range(4):",
      "        t.forward(size)",
      "        t.right(90)",
      "    t.right(360 / petals)"
    ],
    keywords: ["petals", "range(petals)", "360 / petals"],
    challenge_params: [
      {
        name: "petals",
        label: "\u82B1\u5F00\u51E0\u74E3\uFF1F",
        type: "select",
        default: "6",
        options: [
          { value: "4", label: "4 \u74E3" },
          { value: "6", label: "6 \u74E3" },
          { value: "8", label: "8 \u74E3" }
        ],
        apply: { kind: "assign", variable: "petals" }
      },
      {
        name: "size",
        label: "\u6BCF\u7247\u82B1\u74E3\u591A\u5927\uFF1F",
        type: "number",
        min: 40,
        max: 140,
        step: 50,
        default: 90,
        apply: { kind: "assign", variable: "size" }
      }
    ],
    error_mappings: teach([
      {
        pattern: "indent",
        friendlyMessage: "\u5916\u5C42\u5FAA\u73AF\u7F29\u8FDB 4 \u683C\uFF0C\u91CC\u5C42\u5FAA\u73AF\u91CC\u7684\u4E24\u884C\u8FD8\u8981\u518D\u7F29 4 \u683C\u3002"
      }
    ]),
    quiz: {
      question: "\u91CC\u5C42 for j in range(4) \u8D1F\u8D23\u753B\u4EC0\u4E48\uFF1F",
      options: ["\u4E00\u7247\u82B1\u74E3\uFF08\u4E00\u4E2A\u5C0F\u6B63\u65B9\u5F62\uFF09", "\u6574\u6735\u82B1", "\u53EA\u753B\u4E00\u6761\u7EBF"],
      answerIndex: 0,
      explain: "\u5916\u5C42\u5FAA\u73AF\u8F6C\u4E00\u5708\u753B\u4E00\u7247\u82B1\u74E3\uFF0C\u91CC\u5C42\u5FAA\u73AF\u7528 4 \u6761\u8FB9\u628A\u82B1\u74E3\u753B\u6210\u6B63\u65B9\u5F62\u3002"
    },
    estimated_minutes: 20
  }
];
var getLevelById = (id) => LEVELS.find((l) => l.level_id === id);

// src/lib/lessonMaterial.ts
function orderOf(levelId) {
  const matched = /^L(\d+)$/i.exec(levelId.trim());
  if (!matched) return null;
  const order = Number(matched[1]);
  return Number.isInteger(order) && order >= 1 ? order : null;
}
function metaOf(levelId) {
  return curriculumLevelById(levelId) ?? curriculumLevelByOrder(orderOf(levelId) ?? 0);
}
function buildPlayableLevel(levelId) {
  const meta = metaOf(levelId);
  if (!meta) return void 0;
  const level = playableBody(meta);
  if (!level) return void 0;
  return { ...level, is_placeholder: isPlaceholderLevel(meta) };
}
function playableBody(meta) {
  const authored = meta.legacyLevelId ? getLevelById(meta.legacyLevelId) : void 0;
  if (authored) {
    return { ...authored, level_id: meta.levelId, order: meta.order, title: meta.title, goal: meta.goal };
  }
  if (meta.order === 13) return printLesson(meta, "\u4F60\u597D");
  if (meta.order === 14) return squareLesson(meta);
  if (meta.order === 15) return loopLesson(meta);
  if (meta.order === 16) return greetingSquare(meta);
  if (meta.order === 17) return greetingVariable(meta);
  if (meta.order === 18) return changeGreeting(meta);
  if (meta.order === 19) return typingReview(meta);
  if (meta.order === 20) return projectGreeting(meta);
  return placeholderLevel(meta);
}
function placeholderLevel(meta) {
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: "n = 1\nprint(n)",
    expected_output: "1",
    preview_kind: "text",
    teach_code_lines: ["n = 1", "print(n)"],
    keywords: ["print", "print()", "n = 1"],
    challenge_params: [
      {
        name: "n",
        label: "\u628A\u6570\u5B57\u6539\u4E00\u6539",
        type: "number",
        min: 1,
        max: 9,
        step: 1,
        default: 1,
        apply: { kind: "assign", variable: "n" },
        hint: "\u6539\u5927\u4E00\u70B9\uFF0C\u6253\u5370\u51FA\u6765\u7684\u6570\u5B57\u4F1A\u8DDF\u7740\u53D8\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "print(n) \u4F1A\u628A\u4EC0\u4E48\u663E\u793A\u51FA\u6765\uFF1F",
      options: ["\u53D8\u91CF n \u91CC\u7684\u6570\u5B57", "\u4E00\u53EA\u6D77\u9F9F", "\u4EC0\u4E48\u90FD\u4E0D\u663E\u793A"],
      answerIndex: 0,
      explain: "print \u4F1A\u628A\u62EC\u53F7\u91CC\u7684\u7ED3\u679C\u6253\u5370\u5230\u5C4F\u5E55\u4E0A\u3002"
    },
    estimated_minutes: 15
  };
}
function typingReview(meta) {
  const lines = ['print("\u4F60\u597D")', "t.forward(80)", "t.right(90)"];
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: lines.join("\n"),
    expected_output: "\u4F60\u597D\n\u4E00\u6761\u6A2A\u7EBF",
    preview_kind: "turtle",
    teach_code_lines: lines,
    keywords: ['print("\u4F60\u597D")', "t.forward(80)", "t.right(90)"],
    challenge_params: [
      {
        name: "word",
        label: "\u95EE\u5019\u6362\u4E00\u53E5",
        type: "select",
        default: "\u4F60\u597D",
        options: [
          { value: "\u4F60\u597D", label: "\u4F60\u597D" },
          { value: "\u52A0\u6CB9", label: "\u52A0\u6CB9" }
        ],
        apply: { kind: "arg", func: "print", argIndex: 0 },
        hint: "\u5F15\u53F7\u91CC\u7684\u5B57\u4F1A\u6253\u5370\u51FA\u6765\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "\u8FD9\u4E00\u8282\u4E3B\u8981\u5728\u7EC3\u4EC0\u4E48\uFF1F",
      options: ["\u628A\u5B66\u8FC7\u7684\u8BCD\u518D\u6253\u51C6\u786E", "\u65B0\u5B66\u4E00\u4E2A\u6392\u5E8F\u7B97\u6CD5", "\u4EC0\u4E48\u90FD\u4E0D\u7528\u505A"],
      answerIndex: 0,
      explain: "\u6253\u5B57\u5173\u662F\u628A\u5DF2\u7ECF\u89C1\u8FC7\u7684 print\u3001forward\u3001right \u518D\u6572\u4E00\u904D\u3002"
    },
    estimated_minutes: 15
  };
}
function projectGreeting(meta) {
  const lines = ['print("\u9001\u7ED9\u4F60")', "for i in range(4):", "    t.forward(80)", "    t.right(90)"];
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: lines.join("\n"),
    expected_output: "\u9001\u7ED9\u4F60\n\u4E00\u4E2A\u6B63\u65B9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: lines,
    keywords: ['print("\u9001\u7ED9\u4F60")', "for", "range(4)", "t.forward(80)", "t.right(90)"],
    challenge_params: [
      {
        name: "side",
        label: "\u6B63\u65B9\u5F62\u7684\u8FB9\u957F",
        type: "number",
        min: 40,
        max: 140,
        step: 20,
        default: 80,
        apply: { kind: "arg", func: "forward", argIndex: 0 },
        hint: "\u6570\u5B57\u8D8A\u5927\uFF0C\u6B63\u65B9\u5F62\u8D8A\u5927\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "\u8FD9\u4E2A\u4F5C\u54C1\u91CC\uFF0C\u6B63\u65B9\u5F62\u662F\u600E\u4E48\u753B\u51FA\u6765\u7684\uFF1F",
      options: ["\u7528 for \u628A\u300C\u5411\u524D\u3001\u8F6C\u5F2F\u300D\u91CD\u590D 4 \u6B21", "\u53EA\u5199\u4E86\u4E00\u53E5 print", "\u6D77\u9F9F\u81EA\u5DF1\u4F1A\u753B"],
      answerIndex: 0,
      explain: "range(4) \u8BA9\u5411\u524D\u548C\u8F6C\u5F2F\u5404\u505A 4 \u6B21\uFF0C\u56F4\u6210\u4E00\u4E2A\u6B63\u65B9\u5F62\u3002"
    },
    estimated_minutes: 20
  };
}
function greetingSquare(meta) {
  const lines = ['print("\u4F60\u597D")', "for i in range(4):", "    t.forward(80)", "    t.right(90)"];
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: lines.join("\n"),
    expected_output: "\u4F60\u597D\n\u4E00\u4E2A\u6B63\u65B9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: lines,
    line_notes: ["\u5148\u6253\u5370\u4E00\u53E5\u95EE\u5019", "\u628A\u753B\u4E00\u6761\u8FB9\u91CD\u590D 4 \u6B21", "\u6BCF\u6761\u8FB9\u5411\u524D\u8D70 80", "\u8D70\u5B8C\u5411\u53F3\u8F6C 90 \u5EA6"],
    keywords: ['print("\u4F60\u597D")', "for", "range(4)", "t.forward(80)"],
    challenge_params: [
      {
        name: "word",
        label: "\u95EE\u5019\u6362\u4E00\u53E5",
        type: "select",
        default: "\u4F60\u597D",
        options: [
          { value: "\u4F60\u597D", label: "\u4F60\u597D" },
          { value: "\u52A0\u6CB9", label: "\u52A0\u6CB9" }
        ],
        apply: { kind: "arg", func: "print", argIndex: 0 },
        hint: "\u5F15\u53F7\u91CC\u7684\u5B57\u4F1A\u5148\u51FA\u73B0\u5728\u5C4F\u5E55\u4E0A\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "\u8FD9\u6BB5\u4EE3\u7801\u5148\u505A\u4EC0\u4E48\uFF0C\u518D\u505A\u4EC0\u4E48\uFF1F",
      options: ["\u5148\u6253\u5370\u95EE\u5019\uFF0C\u518D\u753B\u6B63\u65B9\u5F62", "\u53EA\u753B\u6B63\u65B9\u5F62", "\u53EA\u6253\u5370\u4E00\u53E5\u8BDD"],
      answerIndex: 0,
      explain: "print \u5148\u628A\u95EE\u5019\u6253\u51FA\u6765\uFF0Cfor \u518D\u628A\u6B63\u65B9\u5F62\u7684\u56DB\u6761\u8FB9\u753B\u5B8C\u3002"
    },
    estimated_minutes: 15
  };
}
function greetingVariable(meta) {
  const lines = ['name = "\u4F60\u597D"', "print(name)"];
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: lines.join("\n"),
    expected_output: "\u4F60\u597D",
    preview_kind: "text",
    teach_code_lines: lines,
    line_notes: ["\u628A\u95EE\u5019\u88C5\u8FDB\u53D8\u91CF name", "\u6253\u5370\u53D8\u91CF\u91CC\u7684\u90A3\u53E5\u8BDD"],
    keywords: ["name", 'name = "\u4F60\u597D"', "print(name)"],
    challenge_params: [
      {
        name: "name",
        label: "\u628A\u95EE\u5019\u6362\u4E00\u53E5",
        type: "select",
        default: "\u4F60\u597D",
        options: [
          { value: "\u4F60\u597D", label: "\u4F60\u597D" },
          { value: "\u52A0\u6CB9", label: "\u52A0\u6CB9" },
          { value: "\u65E9\u4E0A\u597D", label: "\u65E9\u4E0A\u597D" }
        ],
        apply: { kind: "assign", variable: "name" },
        hint: "\u6539\u7684\u662F\u53D8\u91CF\u91CC\u7684\u8BDD\uFF0Cprint \u4F1A\u628A\u65B0\u7684\u4E00\u53E5\u6253\u51FA\u6765\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "print(name) \u6253\u5370\u51FA\u6765\u7684\u662F\u4EC0\u4E48\uFF1F",
      options: ["\u53D8\u91CF name \u91CC\u88C5\u7684\u90A3\u53E5\u8BDD", "\u53D8\u91CF\u7684\u540D\u5B57 name", "\u4E00\u4E2A\u6B63\u65B9\u5F62"],
      answerIndex: 0,
      explain: 'name = "\u4F60\u597D" \u628A\u8FD9\u53E5\u8BDD\u88C5\u8FDB\u53D8\u91CF\uFF0Cprint(name) \u518D\u628A\u5B83\u6253\u5370\u51FA\u6765\u3002'
    },
    estimated_minutes: 15
  };
}
function changeGreeting(meta) {
  const lines = ['name = "\u4F60\u597D"', "side = 80", "print(name)", "for i in range(4):", "    t.forward(side)", "    t.right(90)"];
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: lines.join("\n"),
    expected_output: "\u4F60\u597D\n\u4E00\u4E2A\u6B63\u65B9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: lines,
    line_notes: ["\u95EE\u5019\u88C5\u8FDB name", "\u8FB9\u957F\u88C5\u8FDB side", "\u6253\u5370\u95EE\u5019", "\u91CD\u590D\u753B 4 \u6761\u8FB9", "\u8FB9\u957F\u7528 side", "\u8F6C\u5F2F 90 \u5EA6"],
    keywords: ["name", "side", "print(name)", "t.forward(side)"],
    challenge_params: [
      {
        name: "name",
        label: "\u95EE\u5019\u6362\u4E00\u53E5",
        type: "select",
        default: "\u4F60\u597D",
        options: [
          { value: "\u4F60\u597D", label: "\u4F60\u597D" },
          { value: "\u52A0\u6CB9", label: "\u52A0\u6CB9" }
        ],
        apply: { kind: "assign", variable: "name" },
        hint: "\u6539\u8FD9\u4E00\u53E5\uFF0C\u5C4F\u5E55\u4E0A\u7684\u95EE\u5019\u4F1A\u8DDF\u7740\u53D8\u3002"
      },
      {
        name: "side",
        label: "\u8FB9\u957F\u6539\u4E00\u6539",
        type: "number",
        min: 40,
        max: 140,
        step: 20,
        default: 80,
        apply: { kind: "assign", variable: "side" },
        hint: "\u6539\u8FD9\u4E2A\u6570\u5B57\uFF0C\u6B63\u65B9\u5F62\u7684\u56DB\u6761\u8FB9\u4E00\u8D77\u53D8\u957F\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "\u60F3\u8BA9\u6B63\u65B9\u5F62\u53D8\u5927\uFF0C\u8981\u6539\u54EA\u91CC\uFF1F",
      options: ["\u6539 side \u91CC\u7684\u6570\u5B57", "\u6539 name \u91CC\u7684\u95EE\u5019", "\u628A range(4) \u6539\u6210 range(40)"],
      answerIndex: 0,
      explain: "side \u88C5\u7740\u8FB9\u957F\uFF0Cforward \u7528\u7684\u5C31\u662F\u8FD9\u4E2A\u6570\u3002"
    },
    estimated_minutes: 20
  };
}
function printLesson(meta, word) {
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: `print("${word}")`,
    expected_output: word,
    preview_kind: "text",
    teach_code_lines: [`print("${word}")`],
    keywords: ["print", "print()", 'print("")'],
    challenge_params: [
      {
        name: "word",
        label: "\u628A\u8FD9\u53E5\u8BDD\u6362\u4E00\u6362",
        type: "select",
        default: word,
        options: [
          { value: word, label: word },
          { value: "Hello", label: "Hello" }
        ],
        apply: { kind: "arg", func: "print", argIndex: 0 }
      }
    ],
    error_mappings: [],
    quiz: {
      question: "print \u8FD9\u4E00\u884C\u8DD1\u5B8C\uFF0C\u5C4F\u5E55\u4E0A\u4F1A\u51FA\u73B0\u4EC0\u4E48\uFF1F",
      options: [word, "\u4E00\u4E2A\u6B63\u65B9\u5F62", "\u4EC0\u4E48\u90FD\u6CA1\u6709"],
      answerIndex: 0,
      explain: "\u5F15\u53F7\u91CC\u7684\u5B57\u4F1A\u539F\u6837\u6253\u5370\u51FA\u6765\u3002"
    },
    estimated_minutes: 15
  };
}
function squareLesson(meta) {
  const lines = ["t.forward(80)", "t.right(90)", "t.forward(80)", "t.right(90)"];
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: lines.join("\n"),
    expected_output: "\u4E00\u4E2A\u6B63\u65B9\u5F62\u7684\u4E00\u534A",
    preview_kind: "turtle",
    teach_code_lines: lines,
    keywords: ["t.forward", "t.right", "t.right(90)"],
    challenge_params: [
      {
        name: "side",
        label: "\u8FB9\u957F\u6539\u4E00\u6539",
        type: "number",
        min: 40,
        max: 140,
        step: 20,
        default: 80,
        apply: { kind: "arg", func: "t.forward", argIndex: 0, occurrence: "all" },
        hint: "\u4E24\u6761\u8FB9\u4F1A\u4E00\u8D77\u53D8\u957F\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "t.right(90) \u662F\u5728\u505A\u4EC0\u4E48\uFF1F",
      options: ["\u5411\u53F3\u8F6C 90 \u5EA6", "\u5411\u524D\u8D70 90 \u6B65", "\u628A\u989C\u8272\u6539\u6210\u7EA2\u8272"],
      answerIndex: 0,
      explain: "right \u662F\u8F6C\u5F2F\uFF0C\u62EC\u53F7\u91CC\u7684\u6570\u5B57\u662F\u89D2\u5EA6\u3002"
    },
    estimated_minutes: 15
  };
}
function loopLesson(meta) {
  const lines = ["for i in range(4):", "    t.forward(80)", "    t.right(90)"];
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: "normal",
    demo_code: lines.join("\n"),
    expected_output: "\u4E00\u4E2A\u6B63\u65B9\u5F62",
    preview_kind: "turtle",
    teach_code_lines: lines,
    keywords: ["for", "range(4)", "t.forward"],
    challenge_params: [
      {
        name: "sides",
        label: "\u91CD\u590D\u51E0\u6B21",
        type: "number",
        min: 3,
        max: 8,
        step: 1,
        default: 4,
        apply: { kind: "arg", func: "range", argIndex: 0 },
        hint: "\u6539\u8FD9\u4E2A\u6570\u5B57\uFF0C\u8FB9\u6570\u4F1A\u8DDF\u7740\u53D8\u3002"
      }
    ],
    error_mappings: [],
    quiz: {
      question: "range(4) \u4F1A\u8BA9\u5FAA\u73AF\u8D70\u51E0\u904D\uFF1F",
      options: ["4 \u904D", "3 \u904D", "40 \u904D"],
      answerIndex: 0,
      explain: "range(4) \u5C31\u662F\u91CD\u590D 4 \u6B21\u3002"
    },
    estimated_minutes: 15
  };
}

// server/curriculum.ts
function orderOf2(levelId) {
  const matched = /^L(\d+)$/i.exec(levelId.trim());
  if (!matched) return null;
  const order = Number(matched[1]);
  return Number.isInteger(order) && order >= 1 ? order : null;
}
function missingRelation(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("does not exist");
}
async function readProgressMarks(studentId) {
  const sql = (table) => `select cl.sort_order, src.completed, src.stars
     from public.${table} src
     join public.course_level cl on cl.level_id = src.level_id
     where src.student_id = $1`;
  try {
    const rows = await q(sql("learning_record"), [studentId]);
    return rows.map((row) => ({ order: Number(row.sort_order), completed: Boolean(row.completed), stars: Number(row.stars) || 0 }));
  } catch (error) {
    if (!missingRelation(error)) throw error;
    const rows = await q(sql("level_progress"), [studentId]);
    return rows.map((row) => ({ order: Number(row.sort_order), completed: Boolean(row.completed), stars: Number(row.stars) || 0 }));
  }
}
async function resolveStoredLevel(requested) {
  const direct = await one(
    "select level_id, sort_order from public.course_level where level_id = $1",
    [requested]
  );
  if (direct) return { levelId: direct.level_id, order: Number(direct.sort_order) };
  const order = orderOf2(requested);
  if (!order) return null;
  const byOrder2 = await one(
    "select level_id, sort_order from public.course_level where sort_order = $1",
    [order]
  );
  if (byOrder2) return { levelId: byOrder2.level_id, order: Number(byOrder2.sort_order) };
  const meta = curriculumLevelByOrder(order);
  const unit = meta ? curriculumUnitById(meta.unitId) : void 0;
  const playable = meta ? buildPlayableLevel(meta.levelId) : void 0;
  if (!meta || !unit || !playable) return null;
  await q(
    `insert into public.course_level
      (level_id, sort_order, title, goal, body, published, unit_id, knowledge_tags, level_type, milestone_badge)
     values ($1, $2, $3, $4, $5::jsonb, true, $6, string_to_array($7, ','), $8, $9)
     on conflict (level_id) do nothing`,
    [
      meta.levelId,
      meta.order,
      meta.title,
      meta.goal,
      JSON.stringify(playable),
      meta.unitId,
      meta.knowledgeTags.join(","),
      meta.levelType,
      meta.milestoneBadge
    ]
  );
  const created = await one(
    "select level_id, sort_order from public.course_level where level_id = $1 or sort_order = $2",
    [meta.levelId, meta.order]
  );
  return created ? { levelId: created.level_id, order: Number(created.sort_order) } : null;
}

// src/lib/curriculumState.ts
function focusOrder(marks) {
  const completed = new Set(marks.filter((mark) => mark.completed).map((mark) => mark.order));
  let order = 1;
  while (completed.has(order) && order <= CURRICULUM_LEVELS.length) order += 1;
  return Math.min(order, CURRICULUM_LEVELS.length);
}
function serviceOpen(status) {
  return status === "trial" || status === "active";
}
function canOpen(order, completed, focus, access) {
  const entitled = isLevelEntitled(access.spans, access.orgId, access.groupId, access.studentId, order);
  const trialOk = access.status !== "trial" || order <= TRIAL_LEVEL_MAX;
  return entitled && serviceOpen(access.status) && trialOk && (completed || order === focus);
}
function starOf(value) {
  if (value === 1 || value === 2 || value === 3) return value;
  return 0;
}
function presentLearningHome(marks, access) {
  const focus = focusOrder(marks);
  const stage = stageOfOrder(focus) ?? stageOfOrder(1);
  const completed = new Set(marks.filter((mark) => mark.completed).map((mark) => mark.order));
  const units = stagesThrough(stage?.stageLevel ?? 1).flatMap(
    (item) => unitsOfStage(item.stageLevel).map((unit) => {
      const levels = levelsOfUnit(unit.unitId);
      const first = levels[0]?.order ?? 0;
      const last = levels[levels.length - 1]?.order ?? 0;
      const state = focus >= first && focus <= last ? "current" : focus > last ? "past" : "future";
      return {
        unitId: unit.unitId,
        title: unit.title,
        sortOrder: unit.sortOrder,
        stageLevel: unit.stageLevel,
        completedCount: levels.filter((level) => completed.has(level.order)).length,
        total: levels.length,
        state
      };
    })
  );
  const current = curriculumLevelByOrder(focus);
  const currentUnitId = current?.unitId ?? units[0]?.unitId ?? "";
  return {
    heading: stage?.title ?? "Level 1",
    stageLevel: stage?.stageLevel ?? 1,
    stageTitle: stage?.title ?? "Level 1",
    stageSubtitle: stage?.subtitle ?? "\u57FA\u7840\u5165\u95E8",
    units,
    currentUnitId,
    currentOrder: focus,
    completedCount: completed.size,
    entries: projectUnit(currentUnitId, marks, access) ?? []
  };
}
function projectUnit(unitId, marks, access) {
  const unit = curriculumUnitById(unitId);
  if (!unit) return null;
  const focus = focusOrder(marks);
  const stars = new Map(marks.map((mark) => [mark.order, mark.stars]));
  const completed = new Set(marks.filter((mark) => mark.completed).map((mark) => mark.order));
  return levelsOfUnit(unitId).map((level) => {
    const done = completed.has(level.order);
    const unlocked = canOpen(level.order, done, focus, access);
    return {
      levelId: level.levelId,
      order: level.order,
      title: level.title,
      goal: level.goal,
      levelType: level.levelType,
      milestoneBadge: level.milestoneBadge,
      placeholder: isPlaceholderLevel(level),
      is_placeholder: isPlaceholderLevel(level),
      completed: done,
      unlocked,
      current: unlocked && !done && level.order === focus,
      stars: starOf(stars.get(level.order) ?? 0)
    };
  });
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
function missingRelation2(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("does not exist");
}
async function readLevelProgress(studentId) {
  try {
    return await q("select level_id, completed, stars from public.learning_record where student_id = $1", [studentId]);
  } catch (error) {
    if (!missingRelation2(error)) throw error;
    return await q("select level_id, completed, stars from public.level_progress where student_id = $1", [studentId]);
  }
}
async function writeLevelProgress(studentId, levelId, stars, taps) {
  try {
    await q(
      `insert into public.learning_record (student_id, level_id, completed, stars, change_done, error_taps, runs)
       values ($1, $2, true, $3, true, $4, 1)
       on conflict (student_id, level_id) do update set
         completed = true,
         stars = excluded.stars,
         change_done = true,
         error_taps = excluded.error_taps,
         runs = public.learning_record.runs + 1,
         updated_at = now()`,
      [studentId, levelId, stars, taps]
    );
  } catch (error) {
    if (!missingRelation2(error)) throw error;
    const existing = await one("select id, runs from public.level_progress where student_id = $1 and level_id = $2", [
      studentId,
      levelId
    ]);
    if (existing) {
      await q(
        "update public.level_progress set completed = true, stars = $2, change_done = true, error_taps = $3, runs = $4, updated_at = now() where id = $1",
        [existing.id, stars, taps, existing.runs + 1]
      );
    } else {
      await q(
        "insert into public.level_progress (student_id, level_id, completed, stars, change_done, error_taps, runs) values ($1, $2, true, $3, true, $4, 1)",
        [studentId, levelId, stars, taps]
      );
    }
  }
}
async function loadCurriculumPosition(studentId) {
  try {
    const row = await one("select * from public.student_curriculum_position($1)", [studentId]);
    return row?.level_id ? toCurriculumPosition(row) : null;
  } catch {
    return null;
  }
}
function isOrgStatus2(value) {
  return value === "trial" || value === "active" || value === "expired" || value === "disabled";
}
async function effectiveStatus(org) {
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
  const status = await effectiveStatus({ status: row.org_status, trial_expire_at: row.trial_expire_at, service_end_at: row.service_end_at });
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
  const status = await effectiveStatus({ status: row.org_status, trial_expire_at: row.trial_expire_at, service_end_at: row.service_end_at });
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
  const status = await effectiveStatus(org);
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
  if (action === "progress") {
    const studentId = typeof req.body.studentId === "string" ? req.body.studentId.trim() : "";
    const student = await one(
      "select name, current_level_order from public.student where id = $1 and org_id = $2",
      [studentId, ctx.orgId]
    );
    if (!student) return fail(404, "\u6CA1\u6709\u8FD9\u540D\u5B66\u751F");
    const lessons = await q(
      `select cl.level_id, cl.sort_order, cl.title, cl.teaching_intent, cl.teacher_guide,
              coalesce(lr.completed, false) as completed
       from public.course_level cl
       left join public.learning_record lr
         on lr.level_id = cl.level_id and lr.student_id = $1
       where lr.student_id is not null or cl.sort_order = $2
       order by cl.sort_order`,
      [studentId, student.current_level_order]
    );
    return ok({
      name: student.name,
      lessons: lessons.map((row) => ({
        levelId: row.level_id,
        order: row.sort_order,
        title: row.title,
        completed: row.completed === true,
        current: row.sort_order === student.current_level_order,
        teachingIntent: row.teaching_intent,
        teacherGuide: row.teacher_guide
      }))
    });
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
async function orgPackageLevel(orgId) {
  const grant = await one("select max_level from public.org_entitlement where org_id = $1", [orgId]);
  const level = Number(grant?.max_level);
  return Number.isInteger(level) && level > 0 ? level : 0;
}
async function orgPricing(orgId) {
  const row = await one(
    `select o.student_monthly_price, c.value as base_seat_price
     from public.org o
     join public.platform_configs c on c.key = 'base_seat_price'
     where o.id = $1`,
    [orgId]
  );
  const baseSeatPrice = Number(row?.base_seat_price);
  const studentMonthlyPrice = Number(row?.student_monthly_price);
  if (!Number.isInteger(baseSeatPrice) || baseSeatPrice < 1) throw new Error("\u7F3A\u5C11\u5E73\u53F0\u5E95\u4EF7\u914D\u7F6E");
  return { studentMonthlyPrice, baseSeatPrice };
}
async function orgCourse(req) {
  const action = req.header("x-action") ?? "read";
  const ctx = await orgContext(req, { write: action === "save" || action === "save-price" });
  if (!("orgId" in ctx)) return ctx;
  const countRow = await one("select count(*)::int as n from public.course_level where published = true");
  const levelCount = countRow?.n ?? 0;
  if (action === "save-price") {
    const studentMonthlyPrice = Number(req.body.studentMonthlyPrice);
    if (!Number.isInteger(studentMonthlyPrice) || studentMonthlyPrice < 150 || studentMonthlyPrice > 500) {
      return fail(400, "\u5BB6\u957F\u5B9A\u4EF7\u9700\u8981\u5728 150 \u5230 500 \u5143\u4E4B\u95F4");
    }
    await q("update public.org set student_monthly_price = $2 where id = $1", [ctx.orgId, studentMonthlyPrice]);
  }
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
    const pricing2 = await orgPricing(ctx.orgId);
    return ok({ groupId, seats, expiresAt, activatedAt, levelCount, maxLevel: await orgPackageLevel(ctx.orgId), ...pricing2 });
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
  const pricing = await orgPricing(ctx.orgId);
  return ok({
    groupId: data?.group_id ?? "all",
    seats: data?.seats ?? org?.seat_quota ?? ctx.seatLimit,
    expiresAt: data?.expires_at ?? fallbackEnd,
    activatedAt: data?.activated_at ?? org?.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
    levelCount,
    maxLevel: await orgPackageLevel(ctx.orgId),
    ...pricing
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
  const progress = ids.length ? await q("select student_id from public.learning_record where completed = true and student_id = any($1::uuid[])", [ids]).catch(async (error) => {
    if (!missingRelation2(error)) throw error;
    return q("select student_id from public.level_progress where completed = true and student_id = any($1::uuid[])", [ids]);
  }) : [];
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
function previewBlocksProgress(body) {
  return body.preview === true || body.preview === "true" || body.sandbox === true;
}
async function studentLearning(req) {
  const auth = await requireRole(req, "student");
  if ("status" in auth) return { status: auth.status, body: auth.status === 401 ? { message: "\u8BF7\u5148\u767B\u5F55" } : auth.body };
  const student = await one("select id, org_id, group_id, name, account, status, bind_code, current_level_order, last_active_at from public.student where id = $1", [
    auth.subjectId
  ]);
  if (!student || student.status !== "active") return fail(401, "\u8BF7\u5148\u767B\u5F55");
  const action = typeof req.body.action === "string" ? req.body.action : "map";
  if (previewBlocksProgress(req.body) && (action === "typing" || action === "touch" || action === "complete")) {
    return fail(403, "\u9884\u89C8\u6A21\u5F0F\u4E0D\u4F1A\u8BB0\u5F55\u5B66\u4E60\u8FDB\u5EA6");
  }
  const levelRaw = req.body.levelId;
  const requestedLevelId = typeof levelRaw === "number" && Number.isInteger(levelRaw) ? String(levelRaw) : typeof levelRaw === "string" ? levelRaw.trim() : "";
  if (action === "typing") {
    const decision = await decideStudentLevel(student.id, requestedLevelId || "L01");
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result };
    const raw = req.body.practiceType === "baseline_keys" ? "home_row" : req.body.practiceType;
    if (raw !== "home_row" && raw !== "keywords" && raw !== "lesson_embedded") return fail(400, "\u7EC3\u4E60\u7C7B\u578B\u4E0D\u6B63\u786E");
    const score = normalizeTypingScore(req.body.wpm, req.body.accuracy);
    if (!score) return fail(400, "\u6253\u5B57\u8BB0\u5F55\u65E0\u6548");
    await q("insert into public.typing_record (student_id, practiced_on, practice_type, wpm, accuracy) values ($1, current_date, $2, $3, $4)", [
      student.id,
      raw,
      score.wpm,
      score.accuracy
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
    const stored = await resolveStoredLevel(decision.levelId);
    const stars = Number(req.body.stars);
    const errorTaps = Number(req.body.errorTaps ?? 0);
    if (!stored || !Number.isInteger(stars) || stars < 0 || stars > 3) return fail(400, "\u5B8C\u6210\u8BB0\u5F55\u4E0D\u5B8C\u6574");
    await q("update public.study_session set ended_at = now() where student_id = $1 and ended_at is null", [student.id]);
    const taps = Number.isFinite(errorTaps) ? errorTaps : 0;
    await writeLevelProgress(student.id, stored.levelId, stars, taps);
    if (stored.order + 1 > student.current_level_order) {
      await q("update public.student set current_level_order = $2, last_active_at = now() where id = $1", [student.id, stored.order + 1]);
    } else {
      await q("update public.student set last_active_at = now() where id = $1", [student.id]);
    }
    return ok({ ok: true });
  }
  if (action === "level") {
    const decision = await decideStudentLevel(student.id, requestedLevelId);
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result };
    const playable = buildPlayableLevel(decision.levelId);
    if (!playable) return fail(404, "\u6CA1\u6709\u627E\u5230\u8FD9\u4E00\u5173");
    const storedCopy = await findCourseLevel(decision.levelId);
    const hints2 = await q("select pattern, friendly_message from public.error_hint");
    return ok({ level: withStoredGoal(playable, storedCopy?.goal), hints: hints2 });
  }
  const access = await loadStudentAccess(student);
  const marks = await readProgressMarks(student.id);
  if (action === "unit") {
    const unitId = typeof req.body.unitId === "string" ? req.body.unitId.trim() : "";
    const unit = curriculumUnitById(unitId);
    const levels = unit ? projectUnit(unitId, marks, access) : null;
    if (!unit || !levels) return fail(404, "\u6CA1\u6709\u8FD9\u4E2A\u5355\u5143");
    return ok({ unitId: unit.unitId, title: unit.title, levels });
  }
  const home = presentLearningHome(marks, access);
  const hints = await q("select pattern, friendly_message from public.error_hint");
  const group = await one("select name from public.student_group where id = $1", [student.group_id]);
  const entries = home.entries.map((level) => ({
    levelId: level.levelId,
    order: level.order,
    title: level.title,
    goal: level.goal,
    isReview: false,
    completed: level.completed,
    stars: level.stars,
    unlocked: level.unlocked,
    current: level.current
  }));
  const typingRows = await q(
    "select practiced_on, wpm, accuracy, created_at from public.typing_record where student_id = $1",
    [student.id]
  );
  const latest = [...typingRows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  return ok({
    orgName: access.orgName,
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
    heading: home.heading,
    stageLevel: home.stageLevel,
    stageTitle: home.stageTitle,
    stageSubtitle: home.stageSubtitle,
    units: home.units,
    currentUnitId: home.currentUnitId,
    entries,
    completedCount: home.completedCount,
    currentOrder: home.currentOrder,
    position: await loadCurriculumPosition(student.id),
    hints,
    typingSeries: bucketTyping(typingRows),
    latestTyping: latest ? { wpm: Number(latest.wpm), accuracy: Number(latest.accuracy) } : null
  });
}
async function loadStudentAccess(student) {
  const org = await one(
    "select id, status, trial_expire_at, service_end_at, name from public.org where id = $1",
    [student.org_id]
  );
  const status = org ? await effectiveStatus(org) : "disabled";
  const entitlements = await q("select org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at from public.level_entitlement where org_id = $1", [
    student.org_id
  ]);
  const open = entitlements.filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now());
  return {
    status: status ?? "disabled",
    orgId: student.org_id,
    groupId: student.group_id,
    studentId: student.id,
    orgName: org?.name ?? "",
    spans: open.map((row) => ({
      orgId: row.org_id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      levelOrderMin: row.level_order_min,
      levelOrderMax: row.level_order_max
    }))
  };
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
    const access = org ? await effectiveStatus(org) : "disabled";
    if (!access || access === "disabled") {
      stopped.push({ name: student.name, message: "\u673A\u6784\u670D\u52A1\u5DF2\u505C\u6B62" });
      continue;
    }
    const group = await one("select name from public.student_group where id = $1", [student.group_id]);
    const progress = await readLevelProgress(student.id).then((rows) => rows.filter((row) => row.completed));
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
    const learned = await q(
      `select cl.level_id, cl.sort_order, cl.title, cl.parent_brief
       from public.learning_record lr
       join public.course_level cl on cl.level_id = lr.level_id
       where lr.student_id = $1 and lr.completed = true
       order by cl.sort_order`,
      [student.id]
    );
    const weeklyLevels = await q(
      `select cl.level_id, cl.sort_order, cl.title, cl.parent_brief
       from public.learning_record lr
       join public.course_level cl on cl.level_id = lr.level_id
       where lr.student_id = $1 and lr.completed = true and lr.updated_at >= $2
       order by cl.sort_order`,
      [student.id, start.toISOString()]
    );
    const toBrief = (row) => ({
      levelId: row.level_id,
      order: row.sort_order,
      title: row.title,
      parentBrief: row.parent_brief
    });
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
      position: await loadCurriculumPosition(student.id),
      weekly: {
        weekStart: start.toISOString().slice(0, 10),
        sessions: weeklySessions.length,
        totalMinutes: Math.round(minutes),
        lastStudyDate: last ? asDay(last.started_at) : null
      },
      typingSeries: bucketTyping(typing),
      learnedLessons: learned.map(toBrief),
      weeklyLessons: weeklyLevels.map(toBrief)
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
  const status = await effectiveStatus(org);
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
  const quoted = await one("select * from public.quote_seat_price($1)", [safeSeats]);
  const trial = await one("select value from public.platform_configs where key = 'trial_days'");
  return ok({
    tiers: quoted ? [{ min_seats: 1, max_seats: null, unit_price: quoted.unit_price }] : [],
    example: quoted ? { seats: safeSeats, unitPrice: quoted.unit_price, amount: quoted.amount, plan: quoted.plan_label } : null,
    trialDays: Number(trial?.value) || null
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
  const commissions = await q("select * from public.list_agent_commissions()");
  return ok({
    revenue,
    activeStudents: Number(students?.total ?? 0),
    activeParentsToday: Number(parents?.total ?? 0),
    conversionRate: trialed.size ? Math.round(converted / trialed.size * 100) : 0,
    expiringOrgs,
    seatAlerts,
    commissions: commissions.map((row) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      orgCount: Number(row.org_count),
      seatFeeTotal: Number(row.seat_fee_total),
      rebateDue: Number(row.rebate_due),
      platformNet: Number(row.platform_net)
    }))
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
  const financeOk = action === "ledger" || action === "overview" || action === "billing" || action === "invoice" || action === "quote" || action === "detail" || action === "settings";
  const staff = await requireStaff(req, financeOk ? ["ops", "finance"] : ["ops"]);
  if ("status" in staff) return staff;
  const known = ["\u8BB0\u5F55\u7C7B\u578B", "\u5E2D\u4F4D\u6570", "\u673A\u6784\u4E0D\u5B58\u5728", "\u8BD5\u7528\u8BB0\u5F55", "\u624B\u5DE5\u6539\u4EF7", "\u91D1\u989D", "\u8BF7\u586B\u5199\u670D\u52A1\u671F", "\u5F00\u7968\u72B6\u6001", "\u6536\u8D39\u8BB0\u5F55", "\u53EA\u80FD\u505C\u7528", "\u7EBF\u7D22\u4E0D\u5B58\u5728", "\u8FD9\u4E2A\u72B6\u6001", "\u6700\u4F4E\u5E2D\u4F4D", "\u5E73\u53F0\u5E95\u4EF7", "\u8BD5\u7528\u5929\u6570", "\u5206\u6210\u6BD4\u4F8B", "\u7F3A\u5C11\u5E73\u53F0\u5E95\u4EF7", "\u7F3A\u5C11\u4EE3\u7406\u5206\u6210"];
  if (action === "settings" || action === "save-settings") {
    try {
      if (action === "save-settings") {
        await q("select public.save_platform_configs($1, $2, $3, $4, $5)", [
          staff.id,
          Number(req.body.minSeatCount),
          Number(req.body.baseSeatPrice),
          Number(req.body.trialDays),
          Number(req.body.agentCommissionRate)
        ]);
      }
      const configs = await q("select key, value, description, updated_at from public.list_platform_configs()");
      return ok({ configs });
    } catch (error) {
      return friendly(error, known, "\u914D\u7F6E\u4FDD\u5B58\u5931\u8D25");
    }
  }
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
  const [data, agentLinks] = await Promise.all([
    q("select * from public.list_org_ledger()"),
    q(
      `select ao.org_id, a.name as agent_name
       from public.agent_org ao
       join public.agent a on a.id = ao.agent_id`
    )
  ]);
  const agentByOrg = new Map(agentLinks.map((row) => [row.org_id, row.agent_name]));
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
      expiringSoon: row.expiring_soon,
      agentName: agentByOrg.get(String(row.id)) ?? null
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
  const requestedDays = Number(req.body.trialDays);
  const trialDays = Number.isInteger(requestedDays) ? requestedDays : 0;
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
      ["\u673A\u6784\u540D\u79F0\u9700\u8981", "\u8054\u7CFB\u4EBA\u9700\u8981", "\u8BF7\u586B\u5199 11 \u4F4D\u624B\u673A\u53F7", "\u8BF7\u586B\u5199\u6821\u533A", "\u8BD5\u7528\u5929\u6570\u9700\u8981", "\u5E2D\u4F4D\u989D\u5EA6\u81F3\u5C11\u4E3A", "\u8BD5\u7528\u673A\u6784\u6700\u591A", "\u7EBF\u7D22\u4E0D\u5B58\u5728", "\u8BE5\u7EBF\u7D22\u5DF2\u5F00\u6237", "\u8BE5\u7EBF\u7D22\u4E0D\u80FD\u5F00\u6237", "\u5BC6\u7801\u54C8\u5E0C\u65E0\u6548", "\u6700\u4F4E\u5E2D\u4F4D"],
      "\u5F00\u6237\u5931\u8D25"
    );
  }
}
var COPY_FIELDS = ["goal", "teaching_intent", "parent_brief", "teacher_guide"];
async function findCourseLevel(levelId) {
  if (!levelId) return null;
  const matched = /^L(\d+)$/i.exec(levelId);
  const order = matched ? Number(matched[1]) : null;
  return one(
    `select level_id, preview_frozen, goal
     from public.course_level
     where level_id = $1 or ($2::int is not null and sort_order = $2)
     order by case when level_id = $1 then 0 else 1 end
     limit 1`,
    [levelId, order]
  );
}
function withStoredGoal(level, goal) {
  const next = goal?.trim();
  if (!next) return level;
  return { ...level, goal: next };
}
async function courseCatalog(req) {
  const staff = await requireStaff(req, ["ops"]);
  if ("status" in staff) return staff;
  const action = typeof req.body.action === "string" ? req.body.action : "list";
  if (action === "tree") {
    const rows = await q(COURSE_TREE_SQL);
    return ok({ stages: groupCourseTree(rows) });
  }
  if (action === "preview" || action === "preview-lock") {
    const raw = req.body.levelId;
    const levelId = typeof raw === "number" && Number.isInteger(raw) ? String(raw) : typeof raw === "string" ? raw.trim() : "";
    const stored = await findCourseLevel(levelId);
    if (!stored) return fail(404, "\u6CA1\u6709\u627E\u5230\u8FD9\u4E00\u5173");
    if (action === "preview-lock") {
      const frozen = req.body.frozen === true;
      const saved = await one(
        "update public.course_level set preview_frozen = $2, updated_at = now() where level_id = $1 returning preview_frozen",
        [stored.level_id, frozen]
      );
      return ok({ levelId: stored.level_id, previewFrozen: saved?.preview_frozen === true });
    }
    if (stored.preview_frozen === true) return fail(403, "\u8FD9\u4E00\u5173\u5DF2\u51BB\u7ED3\uFF0C\u4E0D\u80FD\u8BD5\u8BFE\u9884\u89C8");
    const playable = buildPlayableLevel(levelId) ?? buildPlayableLevel(stored.level_id);
    if (!playable) return fail(404, "\u6CA1\u6709\u627E\u5230\u8FD9\u4E00\u5173");
    const hints = await q("select pattern, friendly_message from public.error_hint");
    return ok({ level: withStoredGoal(playable, stored.goal), hints });
  }
  if (action === "copy-save" || action === "copy-history") {
    const raw = req.body.levelId;
    const levelId = typeof raw === "number" && Number.isInteger(raw) ? String(raw) : typeof raw === "string" ? raw.trim() : "";
    const stored = await findCourseLevel(levelId);
    if (!stored) return fail(404, "\u6CA1\u6709\u627E\u5230\u8FD9\u4E00\u5173");
    if (action === "copy-history") {
      const [revision, entries] = await Promise.all([
        one("select revision_count from public.course_level where level_id = $1", [stored.level_id]),
        q(
          `select field, previous_text, next_text, revision_count, editor_name, created_at
           from public.content_history
           where level_id = $1
           order by created_at desc
           limit 20`,
          [stored.level_id]
        )
      ]);
      return ok({
        revisionCount: revision?.revision_count ?? 0,
        entries: entries.map((row) => ({
          field: row.field,
          previousText: row.previous_text,
          nextText: row.next_text,
          revisionCount: row.revision_count,
          editorName: row.editor_name,
          editedAt: row.created_at
        }))
      });
    }
    const field = req.body.field;
    if (typeof field !== "string" || !COPY_FIELDS.includes(field)) return fail(400, "\u6587\u6848\u5B57\u6BB5\u4E0D\u6B63\u786E");
    if (typeof req.body.text !== "string") return fail(400, "\u6587\u6848\u5B57\u6BB5\u4E0D\u6B63\u786E");
    try {
      const saved = await one(
        `select changed, revision_count, stored_text
         from public.save_course_copy($1, $2, $3, $4::uuid, $5)`,
        [stored.level_id, field, req.body.text, staff.id, staff.displayName]
      );
      if (!saved) return fail(500, "\u6587\u6848\u6CA1\u6709\u4FDD\u5B58");
      return ok({
        field,
        text: saved.stored_text,
        revisionCount: saved.revision_count,
        changed: saved.changed === true
      });
    } catch (error) {
      return friendly(error, ["\u6587\u6848\u5B57\u6BB5\u4E0D\u6B63\u786E", "\u5B66\u4E60\u76EE\u6807\u4E0D\u80FD\u4E3A\u7A7A", "\u6587\u6848\u8BF7\u63A7\u5236\u5728 2000", "\u6CA1\u6709\u627E\u5230\u8FD9\u4E00\u5173", "\u9700\u8981\u5E73\u53F0\u8FD0\u8425\u6743\u9650"], "\u6587\u6848\u6CA1\u6709\u4FDD\u5B58");
    }
  }
  if (action === "validate" || action === "import") {
    const text = typeof req.body.text === "string" ? req.body.text : "";
    const { report, levels: levels2, placement } = validateCoursePackage(text);
    if (action === "import" && report.ok) {
      if (placement) {
        await q(
          `insert into public.curriculum_unit (unit_id, semester_id, title, sort_order, stage_level)
           values ($1, $2, $3, $4, $5)
           on conflict (unit_id) do update set
             semester_id = excluded.semester_id,
             title = excluded.title,
             sort_order = excluded.sort_order,
             stage_level = excluded.stage_level`,
          [placement.unit.unit_id, placement.legacySemesterId, placement.unit.title, placement.unit.sort_order, placement.stageLevel]
        );
      }
      for (const level of levels2) {
        await q(
          `insert into public.course_level (
             level_id, sort_order, title, goal, body, published, updated_at,
             unit_id, knowledge_tags, level_type, milestone_badge,
             teaching_intent, parent_brief, teacher_guide
           ) values (
             $1, $2, $3, $4, $5::jsonb, true, now(),
             coalesce($6, 'G5-spring-inbox'),
             coalesce($7::text[], '{}'),
             coalesce($8, 'new'),
             $9, $10, $11, $12
           )
           on conflict (level_id) do update set
             sort_order = excluded.sort_order,
             title = excluded.title,
             goal = excluded.goal,
             body = excluded.body,
             published = true,
             updated_at = now(),
             unit_id = case when $13::boolean then excluded.unit_id else public.course_level.unit_id end,
             knowledge_tags = case when $14::boolean then excluded.knowledge_tags else public.course_level.knowledge_tags end,
             level_type = case when $15::boolean then excluded.level_type else public.course_level.level_type end,
             milestone_badge = case when $16::boolean then excluded.milestone_badge else public.course_level.milestone_badge end,
             teaching_intent = case when $17::boolean then excluded.teaching_intent else public.course_level.teaching_intent end,
             parent_brief = case when $18::boolean then excluded.parent_brief else public.course_level.parent_brief end,
             teacher_guide = case when $19::boolean then excluded.teacher_guide else public.course_level.teacher_guide end`,
          [
            level.level_id,
            level.order,
            level.title,
            level.goal,
            JSON.stringify(level),
            level.unit_id ?? null,
            level.knowledge_tags ?? null,
            level.pedagogy ?? null,
            level.milestone_badge ?? null,
            level.teaching_intent ?? null,
            level.parent_brief ?? null,
            level.teacher_guide ?? null,
            Boolean(level.unit_id),
            level.knowledge_tags !== void 0,
            Boolean(level.pedagogy),
            level.milestone_badge !== void 0,
            level.teaching_intent !== void 0,
            level.parent_brief !== void 0,
            level.teacher_guide !== void 0
          ]
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
