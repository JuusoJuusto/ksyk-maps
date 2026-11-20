/**
 * Admin-controlled public switches: the defaults must keep the site working
 * when settings can't be read, and the Play Store link is never trusted.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePublicFlags, DEFAULT_FLAGS } from "../../client/src/lib/publicFlags";

test("defaults: changelog hidden, downloads on, no Play link, not loaded", () => {
  assert.deepEqual(DEFAULT_FLAGS, { showChangelog: false, downloadsEnabled: true, playStoreUrl: "", loaded: false });
  // An unreadable / empty / hostile response never hides downloads or shows the changelog.
  for (const raw of [null, undefined, {}, [], "x", 5]) {
    const f = parsePublicFlags(raw);
    assert.equal(f.showChangelog, false);
    assert.equal(f.downloadsEnabled, true);
    assert.equal(f.playStoreUrl, "");
    assert.equal(f.loaded, true);
  }
});

test("each switch is read strictly", () => {
  assert.equal(parsePublicFlags({ showChangelog: true }).showChangelog, true);
  assert.equal(parsePublicFlags({ showChangelog: "true" }).showChangelog, false, "only a real boolean turns it on");
  assert.equal(parsePublicFlags({ downloadsEnabled: false }).downloadsEnabled, false);
  assert.equal(parsePublicFlags({ downloadsEnabled: null }).downloadsEnabled, true, "unset means on");
  assert.equal(parsePublicFlags({ downloadsEnabled: 0 }).downloadsEnabled, true, "only false turns it off");
});

test("only a https Google Play listing link survives", () => {
  const ok = "https://play.google.com/store/apps/details?id=fi.ksykmaps";
  assert.equal(parsePublicFlags({ playStoreUrl: ok }).playStoreUrl, ok);
  assert.equal(parsePublicFlags({ playStoreUrl: `  ${ok}  ` }).playStoreUrl, ok, "trimmed");
  for (const bad of [
    "javascript:alert(1)", "http://play.google.com/store/apps/details?id=x", "https://evil.example/store/apps/details?id=x",
    "https://play.google.com.evil.example/store/apps/details?id=x", "https://play.google.com/store/apps/details", "https://play.google.com/store/apps/details?id=x y",
    "data:text/html,x", "//play.google.com/store/apps/details?id=x", "",
  ]) {
    assert.equal(parsePublicFlags({ playStoreUrl: bad }).playStoreUrl, "", `rejects ${JSON.stringify(bad)}`);
  }
});
