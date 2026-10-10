export async function saveThenRefresh(save, refresh) {
  const value = await save();
  try {
    await refresh();
    return { value, refreshError: null };
  } catch (refreshError) {
    return { value, refreshError };
  }
}
