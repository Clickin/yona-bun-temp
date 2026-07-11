import test from "node:test";
import assert from "node:assert/strict";
import {
  hasRawLegacyI18nKey,
  loadLegacyMessageKeys,
  rawLegacyI18nKeys,
} from "./legacy-i18n-key-detector.mjs";

test("raw legacy i18n detector uses the complete legacy keyspace", () => {
  const keys = loadLegacyMessageKeys();

  assert.equal(hasRawLegacyI18nKey("common.loading", keys), true);
  assert.equal(hasRawLegacyI18nKey("pullRequest.review.closed / pullRequest.review.total", keys), true);
  assert.equal(hasRawLegacyI18nKey("review.is.empty", keys), true);
  assert.deepEqual(rawLegacyI18nKeys("title.no.results\nsite.sidebar.userList", keys), [
    "site.sidebar.userList",
    "title.no.results",
  ]);
});

test("raw legacy i18n detector ignores translated copy and embedded substrings", () => {
  const keys = loadLegacyMessageKeys();

  assert.equal(hasRawLegacyI18nKey("불러오는 중", keys), false);
  assert.equal(hasRawLegacyI18nKey("prefixcommon.loading", keys), false);
  assert.equal(hasRawLegacyI18nKey("common.loadingSuffix", keys), false);
  assert.equal(hasRawLegacyI18nKey("Board seed confirmed from the fork contributor side.", keys), false);
});
