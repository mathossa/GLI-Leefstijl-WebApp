import test from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { privatePhotoFolder } from "../src/lib/user-photo-cleanup.ts";

test("photo paths use hashed owner folders and reject the public directory", () => {
  const previous = process.env.PRIVATE_UPLOAD_DIR;
  try {
    for (const folder of ["public", "public/notes"]) {
      process.env.PRIVATE_UPLOAD_DIR = resolve(folder);
      assert.throws(() => privatePhotoFolder("../user"), /must not be inside/);
    }
    process.env.PRIVATE_UPLOAD_DIR = resolve(".private-uploads");
    const first = privatePhotoFolder("../user");
    assert.match(first.slice(resolve(".private-uploads").length + 1), /^[a-f0-9]{64}$/);
    assert.equal(first, privatePhotoFolder("../user"));
    assert.notEqual(first, privatePhotoFolder("other-user"));
    assert.ok(first.startsWith(join(resolve(".private-uploads"), "/")));
  } finally {
    if (previous === undefined) delete process.env.PRIVATE_UPLOAD_DIR;
    else process.env.PRIVATE_UPLOAD_DIR = previous;
  }
});
