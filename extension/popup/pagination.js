/**
 * Calculate bounded pagination metadata.
 * @param {number} totalItems
 * @param {number} requestedPage
 * @param {number} pageSize
 * @returns {{ totalItems: number, totalPages: number, currentPage: number, pageSize: number, startIndex: number, endIndex: number }}
 */
export function getPaginationMeta(totalItems, requestedPage, pageSize) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer.");
  }

  const safeTotalItems = Number.isInteger(totalItems) && totalItems > 0 ? totalItems : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / pageSize));
  const pageCandidate = Number.isInteger(requestedPage) ? requestedPage : 1;
  const currentPage = Math.min(Math.max(pageCandidate, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, safeTotalItems);

  return {
    totalItems: safeTotalItems,
    totalPages,
    currentPage,
    pageSize,
    startIndex,
    endIndex,
  };
}

/**
 * Slice items for the current page with bounded page index.
 * @template T
 * @param {T[]} items
 * @param {number} requestedPage
 * @param {number} pageSize
 * @returns {{ items: T[], pagination: ReturnType<typeof getPaginationMeta> }}
 */
export function paginateItems(items, requestedPage, pageSize) {
  const sourceItems = Array.isArray(items) ? items : [];
  const pagination = getPaginationMeta(sourceItems.length, requestedPage, pageSize);
  return {
    items: sourceItems.slice(pagination.startIndex, pagination.endIndex),
    pagination,
  };
}
