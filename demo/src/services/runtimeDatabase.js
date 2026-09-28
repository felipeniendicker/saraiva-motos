export function createEmptyDatabase() {
  return { customers: [], bikes: [], products: [], stockMovements: [], sales: [], meta: { nextSaleNumber: 1 } };
}

export function initializeRuntimeDatabase(backendEnabled, loadLegacyDatabase) {
  return backendEnabled ? createEmptyDatabase() : loadLegacyDatabase();
}

export function saveRuntimeDatabase(backendEnabled, saveLegacyDatabase, database) {
  if (!backendEnabled) saveLegacyDatabase(database);
}
