export const getCssVarValue = (variableName: string): string => {
  const style = getComputedStyle(document.body);
  return style.getPropertyValue(variableName);
};
