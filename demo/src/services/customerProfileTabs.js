export const CUSTOMER_PROFILE_TABS = ["dados", "motos", "compras"];

export function getNextCustomerProfileTab(currentTab, key) {
  const currentIndex = CUSTOMER_PROFILE_TABS.indexOf(currentTab);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  if (key === "Home") return CUSTOMER_PROFILE_TABS[0];
  if (key === "End") return CUSTOMER_PROFILE_TABS.at(-1);
  if (key === "ArrowRight") return CUSTOMER_PROFILE_TABS[(safeIndex + 1) % CUSTOMER_PROFILE_TABS.length];
  if (key === "ArrowLeft") return CUSTOMER_PROFILE_TABS[(safeIndex - 1 + CUSTOMER_PROFILE_TABS.length) % CUSTOMER_PROFILE_TABS.length];
  return currentTab;
}
