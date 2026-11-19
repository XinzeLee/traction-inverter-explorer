/** Keep hidden component groups and the translucent cover out of pointer picking. */
export function pickableGroups(parts) {
  return parts.filter(part => part.group.visible && part.id !== 'lid').map(part => part.group);
}
