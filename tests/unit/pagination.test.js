import test from "node:test";
import assert from "node:assert/strict";

import {
  getPaginationMeta,
  paginateItems,
} from "../../extension/popup/pagination.js";

test("getPaginationMeta returns first page for empty collections", () => {
  const meta = getPaginationMeta(0, 1, 10);

  assert.deepEqual(meta, {
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    startIndex: 0,
    endIndex: 0,
  });
});

test("getPaginationMeta clamps requested page into valid range", () => {
  const metaBelow = getPaginationMeta(35, -5, 10);
  const metaAbove = getPaginationMeta(35, 99, 10);

  assert.equal(metaBelow.currentPage, 1);
  assert.equal(metaAbove.currentPage, 4);
});

test("paginateItems returns only page slice for middle page", () => {
  const items = Array.from({ length: 25 }, (_, idx) => idx + 1);
  const result = paginateItems(items, 2, 10);

  assert.deepEqual(result.items, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.pagination.currentPage, 2);
});

test("paginateItems clamps page and returns last available items", () => {
  const items = Array.from({ length: 21 }, (_, idx) => idx + 1);
  const result = paginateItems(items, 9, 10);

  assert.deepEqual(result.items, [21]);
  assert.equal(result.pagination.currentPage, 3);
});

test("paginateItems handles non-array input as empty list", () => {
  const result = paginateItems(null, 1, 10);

  assert.deepEqual(result.items, []);
  assert.equal(result.pagination.totalItems, 0);
  assert.equal(result.pagination.totalPages, 1);
});

test("getPaginationMeta throws on invalid page size", () => {
  assert.throws(
    () => getPaginationMeta(10, 1, 0),
    /pageSize must be a positive integer/
  );
});
