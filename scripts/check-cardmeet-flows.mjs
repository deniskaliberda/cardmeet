import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(text, needle, label) {
  assert.ok(
    text.includes(needle),
    `${label} should contain ${JSON.stringify(needle)}`
  );
}

function assertNotContains(text, needle, label) {
  assert.ok(
    !text.includes(needle),
    `${label} should not contain ${JSON.stringify(needle)}`
  );
}

const sessionActions = read("app/(app)/sessions/actions.ts");
const lfgActions = read("app/(app)/lfg/actions.ts");
const createSessionActions = read("app/(app)/sessions/create/actions.ts");
const migration = read("supabase/migrations/00035_session_lfg_rpc.sql");

assertContains(migration, "CREATE OR REPLACE FUNCTION join_session", "00035 migration");
assertContains(migration, "CREATE OR REPLACE FUNCTION leave_session", "00035 migration");
assertContains(migration, "CREATE OR REPLACE FUNCTION kick_session_participant", "00035 migration");
assertContains(migration, "CREATE OR REPLACE FUNCTION complete_lfg_match", "00035 migration");
assertContains(migration, "SECURITY DEFINER", "00035 migration");
assertContains(migration, "FOR UPDATE", "00035 migration");

assertContains(sessionActions, 'rpc("join_session"', "session actions");
assertContains(sessionActions, 'rpc("leave_session"', "session actions");
assertContains(sessionActions, 'rpc("kick_session_participant"', "session actions");
assertNotContains(sessionActions, 'status: "removed"', "session actions");

assertContains(lfgActions, 'rpc("complete_lfg_match"', "LFG actions");
assertNotContains(lfgActions, 'from("session_participants").insert', "LFG actions");
assertNotContains(lfgActions, 'from("notifications").insert', "LFG actions");

assertContains(createSessionActions, 'rpc("notify_session_invite"', "create session actions");
assertNotContains(createSessionActions, 'from("notifications").insert', "create session actions");

console.log("CardMeet flow regression checks passed.");
