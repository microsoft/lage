export function retainDynamicImport() {
  return {
    name: "retain-dynamic-import",
    resolveDynamicImport(specifier) {
      if (typeof specifier === "string") {
        return null;
      }
      return false;
    },
    renderDynamicImport(entry) {
      if (!entry.targetModuleId) {
        return {
          left: "import(",
          right: ")",
        };
      }
    },
  };
}
